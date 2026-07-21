// LEGAJO.AR â€” Capa de datos: accidentes / ART.
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

const MAP = {
  empleadoId: 'empleado_id', fecha: 'fecha', hora: 'hora', tipo: 'tipo',
  art: 'art', nroSiniestro: 'nro_siniestro', diasBaja: 'dias_baja', estado: 'estado',
};

async function listar(tenantId, { empleadoId } = {}) {
  const cond = ['a.tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empleadoId) { cond.push(`a.empleado_id = $${i++}`); vals.push(empleadoId); }
  const { rows } = await query(
    `SELECT a.*, e.legajo, e.apellido, e.nombre
       FROM legajo.accidente a JOIN legajo.empleado e ON e.id = a.empleado_id
      WHERE ${cond.join(' AND ')} ORDER BY a.fecha DESC LIMIT 500`,
    vals
  );
  return rows.map(rowToDTO);
}

async function crear(tenantId, body) {
  const cols = ['tenant_id'];
  const ph = ['$1'];
  const vals = [tenantId];
  let i = 2;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (body[camel] !== undefined) {
      cols.push(snake); ph.push(`$${i++}`); vals.push(body[camel] === '' ? null : body[camel]);
    }
  }
  const { rows } = await query(
    `INSERT INTO legajo.accidente (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING *`,
    vals
  );
  return rowToDTO(rows[0]);
}

async function actualizar(tenantId, id, body) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [camel, snake] of Object.entries(MAP)) {
    if (camel === 'empleadoId') continue; // no se reasigna el empleado
    if (body[camel] !== undefined) { sets.push(`${snake} = $${i++}`); vals.push(body[camel] === '' ? null : body[camel]); }
  }
  if (!sets.length) return null;
  vals.push(tenantId, id);
  const { rows } = await query(
    `UPDATE legajo.accidente SET ${sets.join(', ')} WHERE tenant_id = $${i++} AND id = $${i} RETURNING *`,
    vals
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

module.exports = { listar, crear, actualizar };
