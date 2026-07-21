// LEGAJO.AR â€” Controller de ausencias (vacaciones / licencias).
const ausencias = require('../data/ausenciasData');
const { empleadoObjetivo } = require('../middleware/legajoAuth');

async function listar(req, res, next) {
  try {
    res.json(await ausencias.listar(req.tenantId, {
      empleadoId: req.query.empleadoId, estado: req.query.estado, tipo: req.query.tipo,
    }));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const empleadoId = empleadoObjetivo(req);
    const { tipo, subtipo, desde, hasta, motivo } = req.body || {};
    if (!empleadoId) return res.status(400).json({ error: 'empleadoId requerido' });
    if (!['VACACIONES', 'LICENCIA'].includes(tipo)) return res.status(400).json({ error: 'tipo debe ser VACACIONES o LICENCIA' });
    if (!desde || !hasta) return res.status(400).json({ error: 'desde y hasta son requeridos' });
    if (new Date(hasta) < new Date(desde)) return res.status(400).json({ error: 'hasta no puede ser anterior a desde' });
    res.status(201).json(await ausencias.crear(req.tenantId, { empleadoId, tipo, subtipo, desde, hasta, motivo }));
  } catch (err) { next(err); }
}

async function decidir(req, res, next) {
  try {
    const estado = (req.body.estado || '').toUpperCase();
    if (!['APROBADA', 'RECHAZADA'].includes(estado)) return res.status(400).json({ error: 'estado debe ser APROBADA o RECHAZADA' });
    const r = await ausencias.decidir(req.tenantId, req.params.id, estado, req.user.email);
    if (!r) return res.status(409).json({ error: 'Solicitud inexistente o ya decidida' });
    res.json(r);
  } catch (err) { next(err); }
}

async function saldo(req, res, next) {
  try {
    const anio = Number(req.query.anio) || new Date().getFullYear();
    const s = await ausencias.saldoVacaciones(req.tenantId, req.params.empleadoId, anio);
    if (!s) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(s);
  } catch (err) { next(err); }
}

module.exports = { listar, crear, decidir, saldo };
