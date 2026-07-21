// LEGAJO.AR â€” Controller de accidentes / ART.
const acc = require('../data/accidentesData');

async function listar(req, res, next) {
  try { res.json(await acc.listar(req.tenantId, { empleadoId: req.query.empleadoId })); }
  catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.empleadoId || !b.fecha) return res.status(400).json({ error: 'empleadoId y fecha son requeridos' });
    res.status(201).json(await acc.crear(req.tenantId, b));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const r = await acc.actualizar(req.tenantId, req.params.id, req.body || {});
    if (!r) return res.status(404).json({ error: 'Accidente no encontrado o sin cambios' });
    res.json(r);
  } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar };
