const { query } = require('../../config/database');

async function getInput(tenantId, empleadoId, periodo) {
  const { rows } = await query(
    `SELECT e.fecha_ingreso, e.afiliado_sindicato, e.convenio_id, e.categoria_id, e.basico_manual,
            c.antiguedad_pct, c.presentismo_pct, c.cuota_sindical_pct,
            c.aporte_solidario_pct, c.jornada_horas_mes,
            emp.contrib_jubilatoria, emp.contrib_obra_social, emp.alicuota_art
       FROM legajo.empleado e
       JOIN legajo.empresa  emp ON emp.id = e.empresa_id
       LEFT JOIN legajo.convenio c ON c.id = e.convenio_id
      WHERE e.tenant_id = $1 AND e.id = $2`,
    [tenantId, empleadoId]
  );
  if (!rows.length) return null;
  const e = rows[0];
  const fueraDeConvenio = !e.convenio_id;

  let basico = Number(e.basico_manual) || 0;
  if (!fueraDeConvenio && e.categoria_id) {
    const esc = await query(
      `SELECT basico FROM legajo.escala
        WHERE tenant_id = $1 AND categoria_id = $2
          AND vigente_desde <= (date_trunc('month', to_date($3, 'YYYY-MM')) + interval '1 month - 1 day')::date
        ORDER BY vigente_desde DESC
        LIMIT 1`,
      [tenantId, e.categoria_id, periodo]
    );
    if (esc.rows.length) basico = Number(esc.rows[0].basico);
  }

  return {
    periodo,
    fechaIngreso: e.fecha_ingreso,
    basico,
    afiliadoSindicato: e.afiliado_sindicato,
    fueraDeConvenio,
    convenio: fueraDeConvenio ? null : {
      antiguedadPct: Number(e.antiguedad_pct),
      presentismoPct: Number(e.presentismo_pct),
      cuotaSindicalPct: Number(e.cuota_sindical_pct),
      aporteSolidarioPct: Number(e.aporte_solidario_pct),
      jornadaHorasMes: Number(e.jornada_horas_mes),
    },
    empresa: {
      contribJubilatoria: Number(e.contrib_jubilatoria),
      contribObraSocial: Number(e.contrib_obra_social),
      alicuotaART: Number(e.alicuota_art),
    },
  };
}

async function getHorasExtrasAprobadas(tenantId, empleadoId, periodo) {
  const { rows } = await query(
    `SELECT tipo, COALESCE(SUM(cantidad), 0) AS horas
       FROM legajo.hora_extra
      WHERE tenant_id = $1 AND empleado_id = $2 AND estado = 'APROBADA'
        AND to_char(fecha, 'YYYY-MM') = $3
      GROUP BY tipo`,
    [tenantId, empleadoId, periodo]
  );
  let horasExtra50 = 0;
  let horasExtra100 = 0;
  for (const r of rows) {
    if (Number(r.tipo) === 50) horasExtra50 = Number(r.horas);
    else if (Number(r.tipo) === 100) horasExtra100 = Number(r.horas);
  }
  return { horasExtra50, horasExtra100 };
}

async function guardar(tenantId, empleadoId, periodo, tipo, recibo) {
  const { rows } = await query(
    `INSERT INTO legajo.liquidacion
        (tenant_id, empleado_id, periodo, tipo, detalle, total_remun, total_descuentos, neto)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, empleado_id, periodo, tipo)
     DO UPDATE SET detalle = EXCLUDED.detalle,
                   total_remun = EXCLUDED.total_remun,
                   total_descuentos = EXCLUDED.total_descuentos,
                   neto = EXCLUDED.neto,
                   created_at = now()
     RETURNING id`,
    [
      tenantId, empleadoId, periodo, tipo || 'MENSUAL',
      JSON.stringify(recibo),
      recibo.totales.totalRemunerativo,
      recibo.totales.totalDescuentos,
      recibo.totales.neto,
    ]
  );
  return rows[0].id;
}

module.exports = { getInput, guardar, getHorasExtrasAprobadas };
