// LEGAJO.AR â€” Capa de datos: formaciÃ³n y EPP (credenciales, capacitaciones, elementos de protecciÃ³n).
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

const MAP = {
  empleadoId: 'empleado_id', tipo: 'tipo', nombre: 'nombre', vence: 'vence', detalle: 'detalle',
};

async function listar(tenantId, { empleadoId, tipo } = {}) {
  const cond = ['f.tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empleadoId) { cond.push(`f.empleado_id = $${i++}`); vals.push(empleadoId); }
  if (tipo) { cond.push(`f.tipo = $${i++}`); vals.push(tipo); }
  const { rows } = await query(
    `SELECT f.*, e.legajo, e.apellido, e.nombre
       FROM legajo.formacion f JOIN legajo.empleado e ON e.id = f.empleado_id
      WHERE ${cond.join(' AND ')} ORDER BY f.vence NULLS LAST, f.nombre`,
    vals
  );
  return rows.map(rowToDTO);
}

// Vencimientos prÃ³ximos (o ya vencidos) dentro de N dÃ­as (default 30).
async function vencimientos(tenantId, dias = 30) {
  const { rows } = await query(
    `SELECT f.*, e.legajo, e.apellido, e.nombre,
            (f.vence - CURRENT_DATE) AS dias_para_vencer
       FROM legajo.formacion f JOIN legajo.empleado e ON e.id = f.empleado_id
      WHERE f.tenant_id = $1 AND f.vence IS NOT NULL
        AND f.vence <= (CURRENT_DATE + ($2 || ' days')::interval)
      ORDER BY f.vence`,
    [tenantId, String(dias)]
  );
  return rows.map(rowToDTO);
}

async function crear(tenantId, body) {
  const cols = ['tenant_id'];
  const ph = ['$1'];
  const vals = [tenantId];
  let i = 2;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (body[camel] !== undefined) { cols.push(snake); ph.push(`$${i++}`); vals.push(body[camel] === '' ? null : body[camel]); }
  }
  const { rows } = await query(
    `INSERT INTO legajo.formacion (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`,
    vals
  );
  return rowToDTO(rows[0]);
}

async function actualizar(tenantId, id, body) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (camel === 'empleadoId') continue;
    if (body[camel] !== undefined) { sets.push(`${snake} = $${i++}`); vals.push(body[camel] === '' ? null : body[camel]); }
  }
  if (!sets.length) return null;
  vals.push(tenantId, id);
  const { rows } = await query(
    `UPDATE legajo.formacion SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND id = $${i} RETURNING *`,
    vals
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

module.exports = { listar, vencimientos, crear, actualizar };
