// LEGAJO.AR â€” Controller de formaciÃ³n y EPP.
const form = require('../data/formacionData');

const TIPOS = ['CREDENCIAL', 'CAPACITACION', 'EPP'];

async function listar(req, res, next) {
  try { res.json(await form.listar(req.tenantId, { empleadoId: req.query.empleadoId, tipo: req.query.tipo })); }
  catch (err) { next(err); }
}

async function vencimientos(req, res, next) {
  try {
    const dias = Number(req.query.dias) || 30;
    res.json(await form.vencimientos(req.tenantId, dias));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.empleadoId || !b.nombre) return res.status(400).json({ error: 'empleadoId y nombre son requeridos' });
    if (!TIPOS.includes(b.tipo)) return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS.join(', ')}` });
    res.status(201).json(await form.crear(req.tenantId, b));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const r = await form.actualizar(req.tenantId, req.params.id, req.body || {});
    if (!r) return res.status(404).json({ error: 'Registro no encontrado o sin cambios' });
    res.json(r);
  } catch (err) { next(err); }
}

module.exports = { listar, vencimientos, crear, actualizar };
