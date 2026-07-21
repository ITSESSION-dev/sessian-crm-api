// LEGAJO.AR â€” Controller de empleados.
const emp = require('../data/empleadosData');

async function listar(req, res, next) {
  try {
    const data = await emp.listar(req.tenantId, {
      empresaId: req.query.empresaId,
      incluirBajas: req.query.incluirBajas === 'true',
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const e = await emp.obtener(req.tenantId, req.params.id);
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(e);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const b = req.body || {};
    const faltan = ['empresaId', 'apellido', 'nombre', 'cuil', 'fechaIngreso']
      .filter((k) => !b[k]);
    if (b.legajo == null) faltan.push('legajo');
    if (faltan.length) {
      return res.status(400).json({ error: `Faltan campos obligatorios: ${faltan.join(', ')}` });
    }
    const e = await emp.crear(req.tenantId, b);
    res.status(201).json(e);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const e = await emp.actualizar(req.tenantId, req.params.id, req.body || {});
    if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(e);
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar };
