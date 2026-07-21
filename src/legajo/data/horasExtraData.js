// LEGAJO.AR â€” Capa de datos: horas extra (carga 50/100 -> aprobaciÃ³n).
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

async function listar(tenantId, { empleadoId, estado } = {}) {
  const cond = ['h.tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empleadoId) { cond.push(`h.empleado_id = $${i++}`); vals.push(empleadoId); }
  if (estado) { cond.push(`h.estado = $${i++}`); vals.push(estado); }
  const { rows } = await query(
    `SELECT h.*, e.legajo, e.apellido, e.nombre
       FROM legajo.hora_extra h JOIN legajo.empleado e ON e.id = h.empleado_id
      WHERE ${cond.join(' AND ')} ORDER BY h.fecha DESC LIMIT 500`,
    vals
  );
  return rows.map(rowToDTO);
}

async function crear(tenantId, { empleadoId, fecha, cantidad, tipo, motivo }) {
  const { rows } = await query(
    `INSERT INTO legajo.hora_extra (tenant_id, empleado_id, fecha, cantidad, tipo, motivo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [tenantId, empleadoId, fecha, cantidad, tipo, motivo || null]
  );
  return rowToDTO(rows[0]);
}

async function decidir(tenantId, id, estado) {
  const { rows } = await query(
    `UPDATE legajo.hora_extra SET estado = $1
      WHERE tenant_id = $2 AND id = $3 AND estado = 'PENDIENTE' RETURNING *`,
    [estado, tenantId, id]
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

module.exports = { listar, crear, decidir };
