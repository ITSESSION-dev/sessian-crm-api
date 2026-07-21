// LEGAJO.AR â€” Controller de fichada y tablero de presentismo.
const fichada = require('../data/fichadaData');
const { empleadoObjetivo } = require('../middleware/legajoAuth');

const METODOS = ['MANUAL', 'FACIAL', 'HUELLA', 'JEFE'];

async function registrar(req, res, next) {
  try {
    const empleadoId = empleadoObjetivo(req);
    if (!empleadoId) return res.status(400).json({ error: 'No se pudo determinar el empleado (empleadoId requerido)' });
    const tipo = (req.body.tipo || '').toUpperCase();
    if (!['ENTRADA', 'SALIDA'].includes(tipo)) return res.status(400).json({ error: 'tipo debe ser ENTRADA o SALIDA' });
    const metodo = (req.body.metodo || 'MANUAL').toUpperCase();
    if (!METODOS.includes(metodo)) return res.status(400).json({ error: 'metodo invÃ¡lido' });
    const f = await fichada.registrar(req.tenantId, {
      empleadoId, tipo, metodo, registradoPor: req.user.email,
    });
    res.status(201).json(f);
  } catch (err) { next(err); }
}

async function listar(req, res, next) {
  try {
    res.json(await fichada.listar(req.tenantId, {
      empleadoId: req.query.empleadoId, desde: req.query.desde, hasta: req.query.hasta,
    }));
  } catch (err) { next(err); }
}

async function dashboard(req, res, next) {
  try { res.json(await fichada.dashboard(req.tenantId)); }
  catch (err) { next(err); }
}

module.exports = { registrar, listar, dashboard };
