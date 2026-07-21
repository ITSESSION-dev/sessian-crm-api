// LEGAJO.AR â€” Sub-router del producto. Se monta en /api/v1/legajo desde src/routes/index.js.
const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');            // reuso del CRM
const { loadLegajoRole, requireLegajoRole } = require('./middleware/legajoAuth');
const empleados = require('./controllers/empleadosController');
const catalogos = require('./controllers/catalogosController');
const liquidacion = require('./controllers/liquidacionController');

// Toda ruta de Legajo requiere sesiÃ³n vÃ¡lida + acceso al producto (deja req.legajo).
router.use(authenticate, loadLegajoRole);

// GestiÃ³n (alta/ediciÃ³n) reservada a RRHH y ADMIN.
const GESTION = requireLegajoRole('ADMIN', 'RRHH');

// â”€â”€ Health / ping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    producto: 'Legajo.ar',
    rol: req.legajo.rol,
    tenant: req.tenantId,
    ts: new Date().toISOString(),
  });
});

// â”€â”€ Empleados â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.get('/empleados', empleados.listar);
router.get('/empleados/:id', empleados.obtener);
router.post('/empleados', GESTION, empleados.crear);
router.patch('/empleados/:id', GESTION, empleados.actualizar);

// â”€â”€ CatÃ¡logos (:tipo = convenios|categorias|escalas|obras-sociales|supervisores) â”€â”€
router.get('/catalogos/:tipo', catalogos.listar);
router.post('/catalogos/:tipo', GESTION, catalogos.crear);
router.patch('/catalogos/:tipo/:id', GESTION, catalogos.actualizar);
router.delete('/catalogos/:tipo/:id', GESTION, catalogos.eliminar);

// â”€â”€ LiquidaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/liquidar', GESTION, liquidacion.liquidarEmpleado);

module.exports = router;
