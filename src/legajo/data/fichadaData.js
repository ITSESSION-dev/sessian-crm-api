// LEGAJO.AR â€” Capa de datos: fichada (entrada/salida) y tablero de presentismo.
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');

async function registrar(tenantId, { empleadoId, tipo, metodo, registradoPor }) {
  const { rows } = await query(
    `INSERT INTO legajo.fichada (tenant_id, empleado_id, tipo, metodo, registrado_por)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [tenantId, empleadoId, tipo, metodo || 'MANUAL', registradoPor || null]
  );
  return rowToDTO(rows[0]);
}

async function listar(tenantId, { empleadoId, desde, hasta } = {}) {
  const cond = ['tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empleadoId) { cond.push(`empleado_id = $${i++}`); vals.push(empleadoId); }
  if (desde) { cond.push(`ts >= $${i++}`); vals.push(desde); }
  if (hasta) { cond.push(`ts <= $${i++}`); vals.push(hasta); }
  const { rows } = await query(
    `SELECT * FROM legajo.fichada WHERE ${cond.join(' AND ')} ORDER BY ts DESC LIMIT 500`,
    vals
  );
  return rows.map(rowToDTO);
}

// Presentismo de hoy: por cada empleado activo, su Ãºltima fichada del dÃ­a.
// Presente = su Ãºltima marca de hoy es ENTRADA.
async function dashboard(tenantId) {
  const { rows } = await query(
    `SELECT e.id AS empleado_id, e.legajo, e.apellido, e.nombre,
            f.tipo AS ultima_marca, f.ts AS ultima_ts
       FROM legajo.empleado e
       LEFT JOIN LATERAL (
         SELECT tipo, ts FROM legajo.fichada f
          WHERE f.empleado_id = e.id AND f.ts::date = CURRENT_DATE
          ORDER BY f.ts DESC LIMIT 1
       ) f ON true
      WHERE e.tenant_id = $1 AND e.fecha_baja IS NULL
      ORDER BY e.apellido, e.nombre`,
    [tenantId]
  );
  const empleados = rows.map(rowToDTO);
  const presentes = empleados.filter((r) => r.ultimaMarca === 'ENTRADA').length;
  return {
    fecha: new Date().toISOString().slice(0, 10),
    total: empleados.length,
    presentes,
    ausentes: empleados.length - presentes,
    empleados,
  };
}

module.exports = { registrar, listar, dashboard };
