// LEGAJO.AR â€” Controller de catÃ¡logos. :tipo = convenios | categorias | escalas | obras-sociales | supervisores
const cat = require('../data/catalogosData');

function handle(err, res, next) {
  if (err && err.status) return res.status(err.status).json({ error: err.message });
  next(err);
}

async function listar(req, res, next) {
  try { res.json(await cat.listar(req.tenantId, req.params.tipo)); }
  catch (err) { handle(err, res, next); }
}

async function crear(req, res, next) {
  try { res.status(201).json(await cat.crear(req.tenantId, req.params.tipo, req.body || {})); }
  catch (err) { handle(err, res, next); }
}

async function actualizar(req, res, next) {
  try {
    const r = await cat.actualizar(req.tenantId, req.params.tipo, req.params.id, req.body || {});
    if (!r) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(r);
  } catch (err) { handle(err, res, next); }
}

async function eliminar(req, res, next) {
  try { await cat.eliminar(req.tenantId, req.params.tipo, req.params.id); res.status(204).end(); }
  catch (err) { handle(err, res, next); }
}

module.exports = { listar, crear, actualizar, eliminar };
