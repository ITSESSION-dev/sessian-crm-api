const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { loadLegajoRole, requireLegajoRole } = require('./middleware/legajoAuth');

const empleados = require('./controllers/empleadosController');
const catalogos = require('./controllers/catalogosController');
const liquidacion = require('./controllers/liquidacionController');
const fichada = require('./controllers/fichadaController');
const ausencias = require('./controllers/ausenciasController');
const horasExtra = require('./controllers/horasExtraController');
const accidentes = require('./controllers/accidentesController');
const formacion = require('./controllers/formacionController');

router.use(authenticate, loadLegajoRole);

const GESTION = requireLegajoRole('ADMIN', 'RRHH');
const APROBAR = requireLegajoRole('ADMIN', 'RRHH', 'GERENTE', 'SUPERVISOR');

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    producto: 'Legajo.ar',
    rol: req.legajo.rol,
    tenant: req.tenantId,
    ts: new Date().toISOString(),
  });
});

router.get('/empleados', empleados.listar);
router.get('/empleados/:id', empleados.obtener);
router.post('/empleados', GESTION, empleados.crear);
router.patch('/empleados/:id', GESTION, empleados.actualizar);

router.get('/catalogos/:tipo', catalogos.listar);
router.post('/catalogos/:tipo', GESTION, catalogos.crear);
router.patch('/catalogos/:tipo/:id', GESTION, catalogos.actualizar);
router.delete('/catalogos/:tipo/:id', GESTION, catalogos.eliminar);

router.get('/fichada/dashboard', fichada.dashboard);
router.get('/fichada', fichada.listar);
router.post('/fichada', fichada.registrar);

router.get('/ausencias', ausencias.listar);
router.get('/ausencias/saldo/:empleadoId', ausencias.saldo);
router.post('/ausencias', ausencias.crear);
router.patch('/ausencias/:id', APROBAR, ausencias.decidir);

router.get('/horas-extras', horasExtra.listar);
router.post('/horas-extras', horasExtra.crear);
router.patch('/horas-extras/:id', APROBAR, horasExtra.decidir);

router.get('/accidentes', accidentes.listar);
router.post('/accidentes', GESTION, accidentes.crear);
router.patch('/accidentes/:id', GESTION, accidentes.actualizar);

router.get('/capacitaciones/vencimientos', formacion.vencimientos);
router.get('/capacitaciones', formacion.listar);
router.post('/capacitaciones', GESTION, formacion.crear);
router.patch('/capacitaciones/:id', GESTION, formacion.actualizar);

router.post('/liquidar', GESTION, liquidacion.liquidarEmpleado);

module.exports = router;
