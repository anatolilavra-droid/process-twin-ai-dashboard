const decisionLogRepository = require('../repositories/decisionLogRepository');
const { serializeDecision } = require('../services/serializers');
const { validateListDecisionsQuery } = require('../validators/decisionValidator');
const { parsePagination } = require('../validators/paginationValidator');
const { buildDecisionExportRows, toCsv } = require('../services/exportService');

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

// Research export: every decision, joined with order type, the explanation
// shown at decision time, and decision latency — everything the app's own
// UI computes, in one pull, for analysis outside the app (R, Python, a
// spreadsheet). `?format=csv` (default) or `?format=json`.
function exportDecisions(req, res, next) {
  try {
    const format = req.query.format === 'json' ? 'json' : 'csv';
    const rows = buildDecisionExportRows();

    if (format === 'json') {
      res.status(200).json(rows);
      return;
    }

    res
      .status(200)
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="process-twin-decisions.csv"')
      .send(toCsv(rows));
  } catch (err) {
    next(err);
  }
}

module.exports = { listDecisions, exportDecisions };
