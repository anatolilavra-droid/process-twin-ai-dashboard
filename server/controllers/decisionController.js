const decisionLogRepository = require('../repositories/decisionLogRepository');
const { serializeDecision } = require('../services/serializers');
const { validateListDecisionsQuery } = require('../validators/decisionValidator');
const { parsePagination } = require('../validators/paginationValidator');

function listDecisions(req, res, next) {
  try {
    const { orderId } = validateListDecisionsQuery(req.query);
    const { limit, offset } = parsePagination(req.query);
    const decisions = decisionLogRepository.list({ orderId, limit, offset });
    res.status(200).json(decisions.map(serializeDecision));
  } catch (err) {
    next(err);
  }
}

module.exports = { listDecisions };
