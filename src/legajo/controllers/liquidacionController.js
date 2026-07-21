const { liquidar } = require('../core/liquidacion');
const liqData = require('../data/liquidacionData');

async function liquidarEmpleado(req, res, next) {
  try {
    const { empleadoId, periodo, tipo, mes } = req.body || {};
    if (!empleadoId || !periodo) {
      return res.status(400).json({ error: 'empleadoId y periodo son requeridos' });
    }
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'periodo invÃ¡lido (formato YYYY-MM)' });
    }
    const input = await liqData.getInput(req.tenantId, empleadoId, periodo);
    if (!input) return res.status(404).json({ error: 'Empleado no encontrado' });

    const heAprobadas = await liqData.getHorasExtrasAprobadas(req.tenantId, empleadoId, periodo);
    input.mes = { ...heAprobadas, ...(mes || {}) };
    const recibo = liquidar(input);
    const id = await liqData.guardar(req.tenantId, empleadoId, periodo, tipo, recibo);

    res.json({ id, recibo });
  } catch (err) { next(err); }
}

module.exports = { liquidarEmpleado };
