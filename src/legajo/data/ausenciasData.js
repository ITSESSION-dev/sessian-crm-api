// LEGAJO.AR â€” Capa de datos: ausencias (vacaciones / licencias) + saldo de vacaciones.
const { query } = require('../../config/database');
const { rowToDTO } = require('./dto');
const { diasVacaciones, calcularAntiguedad } = require('../core/liquidacion');

// DÃ­as calendario inclusive entre dos fechas ISO (YYYY-MM-DD).
function diasEntre(desde, hasta) {
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  return Math.floor((d2 - d1) / 86400000) + 1;
}

async function listar(tenantId, { empleadoId, estado, tipo } = {}) {
  const cond = ['s.tenant_id = $1'];
  const vals = [tenantId];
  let i = 2;
  if (empleadoId) { cond.push(`s.empleado_id = $${i++}`); vals.push(empleadoId); }
  if (estado) { cond.push(`s.estado = $${i++}`); vals.push(estado); }
  if (tipo) { cond.push(`s.tipo = $${i++}`); vals.push(tipo); }
  const { rows } = await query(
    `SELECT s.*, e.legajo, e.apellido, e.nombre
       FROM legajo.solicitud s JOIN legajo.empleado e ON e.id = s.empleado_id
      WHERE ${cond.join(' AND ')} ORDER BY s.created_at DESC LIMIT 500`,
    vals
  );
  return rows.map(rowToDTO);
}

async function crear(tenantId, { empleadoId, tipo, subtipo, desde, hasta, motivo }) {
  const dias = diasEntre(desde, hasta);
  const { rows } = await query(
    `INSERT INTO legajo.solicitud (tenant_id, empleado_id, tipo, subtipo, desde, hasta, dias, motivo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [tenantId, empleadoId, tipo, subtipo || null, desde, hasta, dias, motivo || null]
  );
  return rowToDTO(rows[0]);
}

// Aprueba/rechaza SOLO si estÃ¡ PENDIENTE. Devuelve null si no existe o ya fue decidida.
async function decidir(tenantId, id, estado, decididoPor) {
  const { rows } = await query(
    `UPDATE legajo.solicitud SET estado = $1, decidido_por = $2
      WHERE tenant_id = $3 AND id = $4 AND estado = 'PENDIENTE' RETURNING *`,
    [estado, decididoPor || null, tenantId, id]
  );
  return rows[0] ? rowToDTO(rows[0]) : null;
}

// Saldo de vacaciones del aÃ±o: derecho por antigÃ¼edad (Ley 20.744) âˆ’ dÃ­as aprobados en el aÃ±o.
async function saldoVacaciones(tenantId, empleadoId, anio) {
  const emp = await query(
    'SELECT fecha_ingreso FROM legajo.empleado WHERE tenant_id = $1 AND id = $2',
    [tenantId, empleadoId]
  );
  if (!emp.rows.length) return null;
  const antiguedad = calcularAntiguedad(emp.rows[0].fecha_ingreso, `${anio}-12`);
  const derecho = diasVacaciones(antiguedad);
  const usadosRes = await query(
    `SELECT COALESCE(SUM(dias), 0) AS d FROM legajo.solicitud
      WHERE tenant_id = $1 AND empleado_id = $2 AND tipo = 'VACACIONES'
        AND estado = 'APROBADA' AND EXTRACT(YEAR FROM desde) = $3`,
    [tenantId, empleadoId, anio]
  );
  const usados = Number(usadosRes.rows[0].d);
  return { anio: Number(anio), antiguedad, derecho, usados, saldo: derecho - usados };
}

module.exports = { listar, crear, decidir, saldoVacaciones };
