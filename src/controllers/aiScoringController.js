const { ok } = require('../middleware/errorHandler');
const { scoreLead } = require('../services/aiScoringService');

const scoreLeadById = async (req, res, next) => {
  try {
    const result = await scoreLead(req.params.id, req.tenantId);
    ok(res, result);
  } catch (err) { next(err); }
};

module.exports = { scoreLeadById };