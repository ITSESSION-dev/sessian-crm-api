// ============================================================================
// LEGAJO.AR â€” Motor de liquidaciÃ³n de sueldos (Argentina, liquidaciÃ³n por convenio)
// ----------------------------------------------------------------------------
// FunciÃ³n PURA. Sin dependencias de base de datos ni de framework.
// Adaptado al stack de SOFTWARE SESSIAN: CommonJS (Node.js/Express), sin ORM.
// Implementa las fÃ³rmulas EXACTAS de la secciÃ³n 6 de la especificaciÃ³n tÃ©cnica.
//
// Entrada: un objeto `input` (ver JSDoc de `liquidar`).
// Salida:  { conceptos, totales, costoEmpleador, meta }.
//
// Reglas de redondeo: cada concepto se redondea a 2 decimales (centavos) y los
// totales se calculan sumando conceptos ya redondeados, para que el recibo
// impreso cierre exactamente contra sus lÃ­neas.
// ============================================================================

'use strict';

// --- ParÃ¡metros normativos centralizados (Nota AFIP/ARCA) --------------------
// Cambian por normativa. Se centralizan acÃ¡ para actualizarlos en un solo lugar.
// En producciÃ³n conviene leerlos de una tabla `legajo_parametro` o de env.
const PARAMETROS = {
  APORTE_JUBILATORIO: 0.11, // SIPA - Ley 24.241 (cÃ³digo 500)
  APORTE_INSSJP: 0.03, // Ley 19.032 / PAMI (cÃ³digo 501)
  APORTE_OBRA_SOCIAL: 0.03, // Ley 23.660 (cÃ³digo 502)
  TOPE_BASE_IMPONIBLE_APORTES: null, // sin tope hoy; configurable por ARCA
};

// Tipos de concepto para el recibo
const TIPO = {
  REMUNERATIVO: 'REMUNERATIVO',
  NO_REMUNERATIVO: 'NO_REMUNERATIVO',
  DESCUENTO: 'DESCUENTO',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Redondeo a 2 decimales (centavos) evitando errores de coma flotante. */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Ãšltimo dÃ­a del perÃ­odo YYYY-MM (00:00 UTC del dÃ­a correcto).
 * @param {string} periodo - "YYYY-MM"
 * @returns {Date}
 */
function ultimoDiaDelPeriodo(periodo) {
  const [anio, mes] = periodo.split('-').map(Number);
  // DÃ­a 0 del mes siguiente = Ãºltimo dÃ­a del mes actual.
  return new Date(Date.UTC(anio, mes, 0));
}

/**
 * AÃ±os completos de antigÃ¼edad entre fechaIngreso y el Ãºltimo dÃ­a del perÃ­odo.
 * (SecciÃ³n 6.1)
 */
function calcularAntiguedad(fechaIngreso, periodo) {
  const ingreso = new Date(fechaIngreso);
  const corte = ultimoDiaDelPeriodo(periodo);
  if (ingreso > corte) return 0;

  let anios = corte.getUTCFullYear() - ingreso.getUTCFullYear();
  const mesCorte = corte.getUTCMonth();
  const mesIngreso = ingreso.getUTCMonth();
  // Si todavÃ­a no cumpliÃ³ el "aniversario" dentro del perÃ­odo, resta 1.
  if (
    mesCorte < mesIngreso ||
    (mesCorte === mesIngreso && corte.getUTCDate() < ingreso.getUTCDate())
  ) {
    anios -= 1;
  }
  return Math.max(0, anios);
}

/**
 * DÃ­as de vacaciones segÃºn antigÃ¼edad (Ley 20.744 art. 150). (SecciÃ³n 6.8)
 */
function diasVacaciones(aniosAntiguedad) {
  if (aniosAntiguedad < 5) return 14;
  if (aniosAntiguedad < 10) return 21;
  if (aniosAntiguedad < 20) return 28;
  return 35;
}

// ---------------------------------------------------------------------------
// Motor principal
// ---------------------------------------------------------------------------

/**
 * Liquida un empleado para un perÃ­odo.
 *
 * @param {Object} input
 * @param {string} input.periodo                 - "YYYY-MM"
 * @param {string} input.fechaIngreso            - ISO date
 * @param {number} input.basico                  - bÃ¡sico del perÃ­odo (escala de convenio o basicoManual)
 * @param {Object} input.convenio                - parÃ¡metros del convenio
 * @param {number} input.convenio.antiguedadPct
 * @param {number} input.convenio.presentismoPct
 * @param {number} input.convenio.cuotaSindicalPct
 * @param {number} input.convenio.aporteSolidarioPct
 * @param {number} input.convenio.jornadaHorasMes
 * @param {Object} input.empresa                 - contribuciones patronales
 * @param {number} input.empresa.contribJubilatoria   (def. 0.1617)
 * @param {number} input.empresa.contribObraSocial     (def. 0.06)
 * @param {number} input.empresa.alicuotaART            (def. 0.03)
 * @param {boolean} input.afiliadoSindicato
 * @param {Object} [input.mes]                   - variables del mes
 * @param {number} [input.mes.horasExtra50]      - cantidad de HE al 50%
 * @param {number} [input.mes.horasExtra100]     - cantidad de HE al 100%
 * @param {Array}  [input.mes.noRemunerativos]   - [{ nombre, monto }] (cÃ³digo 300)
 * @param {Array}  [input.mes.descuentosManuales]- [{ nombre, monto }] (cÃ³digo 530)
 * @param {number} [input.mes.ganancias]         - Imp. Ganancias 4Âª cat. (cÃ³digo 520), valor externo
 * @param {Object} [input.mes.sac]               - { mesesSemestre } para liquidar SAC (cÃ³digo 200)
 * @param {boolean} [input.fueraDeConvenio]      - fuerza parÃ¡metros de 6.7
 * @returns {Object} recibo
 */
function liquidar(input) {
  const {
    periodo,
    fechaIngreso,
    afiliadoSindicato = false,
    fueraDeConvenio = false,
  } = input;

  // 6.7 â€” Empleados fuera de convenio: parÃ¡metros fijos.
  const convenio = fueraDeConvenio
    ? {
        antiguedadPct: 0,
        presentismoPct: 0,
        cuotaSindicalPct: 0,
        aporteSolidarioPct: 0,
        jornadaHorasMes: 200,
      }
    : input.convenio;

  const empresa = {
    contribJubilatoria: 0.1617,
    contribObraSocial: 0.06,
    alicuotaART: 0.03,
    ...(input.empresa || {}),
  };

  const mes = input.mes || {};
  const basico = Number(input.basico) || 0;

  const conceptos = [];
  const aniosAntiguedad = calcularAntiguedad(fechaIngreso, periodo);

  // ----- 6.2 Conceptos remunerativos -----
  // 100 â€” Sueldo bÃ¡sico
  const c100 = round2(basico);
  conceptos.push({ codigo: 100, nombre: 'Sueldo bÃ¡sico', tipo: TIPO.REMUNERATIVO, monto: c100 });

  // 110 â€” AntigÃ¼edad = bÃ¡sico Ã— antiguedadPct Ã— aÃ±osAntigÃ¼edad (solo si > 0)
  const antiguedadMonto = basico * convenio.antiguedadPct * aniosAntiguedad;
  let c110 = 0;
  if (antiguedadMonto > 0) {
    c110 = round2(antiguedadMonto);
    conceptos.push({ codigo: 110, nombre: 'AntigÃ¼edad (' + aniosAntiguedad + ' aÃ±os)', tipo: TIPO.REMUNERATIVO, monto: c110 });
  }

  // 120 â€” Presentismo = (bÃ¡sico + antigÃ¼edad) Ã— presentismoPct (solo si > 0)
  const presentismoMonto = (basico + c110) * convenio.presentismoPct;
  let c120 = 0;
  if (presentismoMonto > 0) {
    c120 = round2(presentismoMonto);
    conceptos.push({ codigo: 120, nombre: 'Presentismo', tipo: TIPO.REMUNERATIVO, monto: c120 });
  }

  // Valor hora = (bÃ¡sico + antigÃ¼edad + presentismo) / jornadaHorasMes
  const jornada = convenio.jornadaHorasMes || 200;
  const valorHora = (basico + c110 + c120) / jornada;

  // 130 â€” Horas extra 50% = valorHora Ã— 1.5 Ã— cantidad
  const cantHE50 = Number(mes.horasExtra50) || 0;
  let c130 = 0;
  if (cantHE50 > 0) {
    c130 = round2(valorHora * 1.5 * cantHE50);
    conceptos.push({ codigo: 130, nombre: 'Horas extra 50% (' + cantHE50 + 'h)', tipo: TIPO.REMUNERATIVO, monto: c130 });
  }

  // 131 â€” Horas extra 100% = valorHora Ã— 2 Ã— cantidad
  const cantHE100 = Number(mes.horasExtra100) || 0;
  let c131 = 0;
  if (cantHE100 > 0) {
    c131 = round2(valorHora * 2 * cantHE100);
    conceptos.push({ codigo: 131, nombre: 'Horas extra 100% (' + cantHE100 + 'h)', tipo: TIPO.REMUNERATIVO, monto: c131 });
  }

  // Base remunerativa (sin SAC) â€” usada como base del SAC para evitar circularidad.
  const totalRemBase = round2(c100 + c110 + c120 + c130 + c131);

  // 200 â€” SAC / aguinaldo (opcional) = (totalRemunerativo / 2) Ã— (mesesSemestre / 6)
  let c200 = 0;
  if (mes.sac && Number(mes.sac.mesesSemestre) > 0) {
    const mesesSemestre = Math.min(6, Number(mes.sac.mesesSemestre));
    c200 = round2((totalRemBase / 2) * (mesesSemestre / 6));
    conceptos.push({ codigo: 200, nombre: 'SAC / aguinaldo (' + mesesSemestre + '/6)', tipo: TIPO.REMUNERATIVO, monto: c200 });
  }

  // Total remunerativo = suma de todos los conceptos remunerativos.
  const totalRemunerativo = round2(totalRemBase + c200);

  // ----- 6.3 No remunerativos (cÃ³digo 300) -----
  const noRem = Array.isArray(mes.noRemunerativos) ? mes.noRemunerativos : [];
  let totalNoRemunerativo = 0;
  for (const item of noRem) {
    const monto = round2(Number(item.monto) || 0);
    if (monto === 0) continue;
    totalNoRemunerativo = round2(totalNoRemunerativo + monto);
    conceptos.push({ codigo: 300, nombre: item.nombre || 'No remunerativo', tipo: TIPO.NO_REMUNERATIVO, monto });
  }

  // ----- 6.4 Base imponible para aportes -----
  let baseImponible = totalRemunerativo;
  if (PARAMETROS.TOPE_BASE_IMPONIBLE_APORTES != null) {
    baseImponible = Math.min(baseImponible, PARAMETROS.TOPE_BASE_IMPONIBLE_APORTES);
  }
  baseImponible = round2(baseImponible);

  // ----- 6.5 Descuentos (aportes del empleado) -----
  const d500 = round2(baseImponible * PARAMETROS.APORTE_JUBILATORIO);
  conceptos.push({ codigo: 500, nombre: 'JubilaciÃ³n (SIPA - Ley 24.241)', tipo: TIPO.DESCUENTO, monto: d500 });

  const d501 = round2(baseImponible * PARAMETROS.APORTE_INSSJP);
  conceptos.push({ codigo: 501, nombre: 'Ley 19.032 / INSSJP (PAMI)', tipo: TIPO.DESCUENTO, monto: d501 });

  const d502 = round2(baseImponible * PARAMETROS.APORTE_OBRA_SOCIAL);
  conceptos.push({ codigo: 502, nombre: 'Obra Social (Ley 23.660)', tipo: TIPO.DESCUENTO, monto: d502 });

  // 510 â€” Aporte solidario = totalRemunerativo Ã— aporteSolidarioPct
  let d510 = 0;
  if (convenio.aporteSolidarioPct > 0) {
    d510 = round2(totalRemunerativo * convenio.aporteSolidarioPct);
    if (d510 > 0) conceptos.push({ codigo: 510, nombre: 'Aporte solidario', tipo: TIPO.DESCUENTO, monto: d510 });
  }

  // 511 â€” Cuota sindical = totalRemunerativo Ã— cuotaSindicalPct (solo si afiliado)
  let d511 = 0;
  if (afiliadoSindicato && convenio.cuotaSindicalPct > 0) {
    d511 = round2(totalRemunerativo * convenio.cuotaSindicalPct);
    if (d511 > 0) conceptos.push({ codigo: 511, nombre: 'Cuota sindical', tipo: TIPO.DESCUENTO, monto: d511 });
  }

  // 520 â€” Impuesto a las Ganancias 4Âª cat. (valor externo, hoy manual)
  let d520 = 0;
  if (Number(mes.ganancias) > 0) {
    d520 = round2(Number(mes.ganancias));
    conceptos.push({ codigo: 520, nombre: 'Impuesto a las Ganancias 4Âª cat.', tipo: TIPO.DESCUENTO, monto: d520 });
  }

  // 530 â€” Descuentos manuales (anticipos, embargos, cuota prÃ©stamo, etc.)
  const descManuales = Array.isArray(mes.descuentosManuales) ? mes.descuentosManuales : [];
  let totalDescManuales = 0;
  for (const item of descManuales) {
    const monto = round2(Number(item.monto) || 0);
    if (monto === 0) continue;
    totalDescManuales = round2(totalDescManuales + monto);
    conceptos.push({ codigo: 530, nombre: item.nombre || 'Descuento', tipo: TIPO.DESCUENTO, monto });
  }

  const totalDescuentos = round2(d500 + d501 + d502 + d510 + d511 + d520 + totalDescManuales);

  // Neto a cobrar = total remunerativo + total no remunerativo âˆ’ total descuentos
  const neto = round2(totalRemunerativo + totalNoRemunerativo - totalDescuentos);

  // ----- 6.6 Costo del empleador (contribuciones patronales) -----
  const contribucionesPatronales = round2(
    baseImponible * (empresa.contribJubilatoria + empresa.contribObraSocial + empresa.alicuotaART)
  );
  const costoLaboralTotal = round2(totalRemunerativo + totalNoRemunerativo + contribucionesPatronales);

  return {
    meta: {
      periodo,
      aniosAntiguedad,
      diasVacaciones: diasVacaciones(aniosAntiguedad),
      valorHora: round2(valorHora),
      fueraDeConvenio,
    },
    conceptos,
    totales: {
      totalRemunerativo,
      totalNoRemunerativo,
      baseImponible,
      totalDescuentos,
      neto,
    },
    costoEmpleador: {
      contribucionesPatronales,
      costoLaboralTotal,
    },
  };
}

module.exports = {
  liquidar,
  calcularAntiguedad,
  diasVacaciones,
  ultimoDiaDelPeriodo,
  round2,
  PARAMETROS,
  TIPO,
};
