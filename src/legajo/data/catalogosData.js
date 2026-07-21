// LEGAJO.AR â€” Capa de datos: catÃ¡logos (convenios, categorÃ­as, escalas, obras sociales, supervisores).
// Nombres de tabla y columnas SIEMPRE desde una whitelist -> no hay SQL dinÃ¡mico con input del usuario.
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

const CATALOGOS = {
  convenios: {
    tabla: 'legajo.convenio', orden: 'nombre',
    map: {
      codigo: 'codigo', nombre: 'nombre', antiguedadPct: 'antiguedad_pct',
      presentismoPct: 'presentismo_pct', cuotaSindicalPct: 'cuota_sindical_pct',
      aporteSolidarioPct: 'aporte_solidario_pct', jornadaHorasMes: 'jornada_horas_mes',
    },
  },
  categorias: {
    tabla: 'legajo.categoria', orden: 'nombre',
    map: { convenioId: 'convenio_id', nombre: 'nombre' },
  },
  escalas: {
    tabla: 'legajo.escala', orden: 'vigente_desde DESC',
    map: { categoriaId: 'categoria_id', basico: 'basico', vigenteDesde: 'vigente_desde' },
  },
  'obras-sociales': {
    tabla: 'legajo.obra_social', orden: 'nombre',
    map: { codigo: 'codigo', sigla: 'sigla', nombre: 'nombre' },
  },
  supervisores: {
    tabla: 'legajo.supervisor', orden: 'nombre',
    map: { codigo: 'codigo', nombre: 'nombre' },
  },
};

function def(tipo) {
  const d = CATALOGOS[tipo];
  if (!d) {
    const e = new Error(`CatÃ¡logo desconocido: ${tipo}`);
    e.status = 400;
    throw e;
  }
  return d;
}

async function listar(tenantId, tipo) {
  const d = def(tipo);
  const { rows } = await query(
    `SELECT * FROM ${d.tabla} WHERE tenant_id = $1 ORDER BY ${d.orden}`,
    [tenantId]
  );
  return rows.map(rowToDTO);
}

async function crear(tenantId, tipo, body) {
  const d = def(tipo);
  const cols = ['tenant_id'];
  const ph = ['$1'];
  const vals = [tenantId];
  let i = 2;
  for (const [camel, snake] of Object.entries(d.map)) {
    if (body[camel] !== undefined) {
      cols.push(snake);
      ph.push(`$${i++}`);
      vals.push(body[camel] === '' ? null : body[camel]);
    }
  }
  const { rows } = await query(
    `INSERT INTO ${d.tabla} (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`,
    vals
  );
  return rowToDTO(rows[0]);
}

async function actualizar(tenantId, tipo, id, body) {
  const d = def(tipo);
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [camel, snake] of Object.entries(d.map)) {
    if (body[camel] !== undefined) {
      sets.push(`${snake} = $${i++}`);
      vals.push(body[camel] === '' ? null : body[camel]);
    }
  }
  if (!sets.length) {
    const { rows } = await query(`SELECT * FROM ${d.tabla} WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    return rows[0] ? rowToDTO(rows[0]) : null;
  }
  vals.push(tenantId, id);
  const { rows } = await query(
    `UPDATE ${d.tabla} SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND id = $${i} RETURNING *`,
    vals
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

async function eliminar(tenantId, tipo, id) {
  const d = def(tipo);
  await query(`DELETE FROM ${d.tabla} WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
}

module.exports = { listar, crear, actualizar, eliminar, CATALOGOS };
