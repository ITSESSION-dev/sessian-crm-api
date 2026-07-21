const { query } = require('../../config/database');

async function loadLegajoRole(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT rol, empleado_id, supervisor_id
         FROM legajo.acceso
        WHERE tenant_id = $1 AND user_id = $2 AND activo = true`,
      [req.tenantId, req.user.id]
    );
    if (rows.length) {
      req.legajo = {
        rol: rows[0].rol,
        empleadoId: rows[0].empleado_id,
        supervisorId: rows[0].supervisor_id,
      };
    } else if (req.user.role === 'admin') {
      req.legajo = { rol: 'ADMIN', empleadoId: null, supervisorId: null };
    } else {
      return res.status(403).json({ error: 'Sin acceso a Legajo.ar' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

const requireLegajoRole = (...roles) => (req, res, next) => {
  if (!req.legajo || !roles.includes(req.legajo.rol)) {
    return res.status(403).json({ error: 'Sin permisos para esta acciÃ³n en Legajo.ar' });
  }
  next();
};

function empleadoObjetivo(req) {
  if (req.legajo && req.legajo.rol === 'EMPLEADO') return req.legajo.empleadoId;
  return (req.body && req.body.empleadoId) || (req.legajo && req.legajo.empleadoId) || null;
}

module.exports = { loadLegajoRole, requireLegajoRole, empleadoObjetivo };
