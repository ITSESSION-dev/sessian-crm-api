// LEGAJO.AR â€” AutorizaciÃ³n por rol de producto.
// Se aplica DESPUÃ‰S del authenticate del CRM (que ya deja req.user y req.tenantId).
// Carga el rol de Legajo del usuario desde legajo.acceso y lo deja en req.legajo.
const { query } = require('../../config/database');

// Carga { rol, empleadoId, supervisorId } del usuario actual dentro del tenant.
// Bootstrap: si no tiene fila en legajo.acceso pero es 'admin' del CRM, se le da
// rol ADMIN (para que el admin del tenant pueda configurar Legajo por primera vez).
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

// Gate por rol de Legajo. Uso: requireLegajoRole('ADMIN','RRHH')
const requireLegajoRole = (...roles) => (req, res, next) => {
  if (!req.legajo || !roles.includes(req.legajo.rol)) {
    return res.status(403).json({ error: 'Sin permisos para esta acciÃ³n en Legajo.ar' });
  }
  next();
};

module.exports = { loadLegajoRole, requireLegajoRole };
