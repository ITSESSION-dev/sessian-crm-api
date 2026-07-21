// LEGAJO.AR â€” Controller de horas extra.
const he = require('../data/horasExtraData');
const { empleadoObjetivo } = require('../middleware/legajoAuth');

async function listar(req, res, next) {
  try {
    res.json(await he.listar(req.tenantId, { empleadoId: req.query.empleadoId, estado: req.query.estado }));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const empleadoId = empleadoObjetivo(req);
    const { fecha, cantidad, tipo, motivo } = req.body || {};
    if (!empleadoId) return res.status(400).json({ error: 'empleadoId requerido' });
    if (!fecha) return res.status(400).json({ error: 'fecha requerida' });
    if (!(Number(cantidad) > 0)) return res.status(400).json({ error: 'cantidad debe ser mayor a 0' });
    if (![50, 100].includes(Number(tipo))) return res.status(400).json({ error: 'tipo debe ser 50 o 100' });
    res.status(201).json(await he.crear(req.tenantId, { empleadoId, fecha, cantidad: Number(cantidad), tipo: Number(tipo), motivo }));
  } catch (err) { next(err); }
}

async function decidir(req, res, next) {
  try {
    const estado = (req.body.estado || '').toUpperCase();
    if (!['APROBADA', 'RECHAZADA'].includes(estado)) return res.status(400).json({ error: 'estado debe ser APROBADA o RECHAZADA' });
    const r = await he.decidir(req.tenantId, req.params.id, estado);
    if (!r) return res.status(409).json({ error: 'Hora extra inexistente o ya decidida' });
    res.json(r);
  } catch (err) { next(err); }
}

module.exports = { listar, crear, decidir };
