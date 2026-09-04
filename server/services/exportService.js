const decisionLogRepository = require('../repositories/decisionLogRepository');
const explanationRepository = require('../repositories/explanationRepository');
const { computeDecisionLatencies } = require('./metricsService');

const CSV_COLUMNS = [
  'decisionId',
  'orderId',
  'orderType',
  'action',
  'previousAssignmentId',
  'newAssignmentId',
  'reasonText',
  'createdAt',
  'explanationSource',
  'explanationConfidence',
  'decisionLatencySeconds',
];

// Which assignment's explanation was actually in front of the operator when
// they made this decision: for an override, that's the assignment they were
// looking at when they chose to replace it (previous_assignment_id) — the
// new one doesn't have an explanation yet at the moment of deciding. For an
// accept, it's the assignment they accepted (new_assignment_id, same as
// current). ai_proposed rows have no decision attached to them at all, so
// there's nothing to look up (left null below) — that's correct, not a gap.
function relevantAssignmentId(row) {
  if (row.action === 'human_overridden') return row.previous_assignment_id;
  if (row.action === 'human_accepted') return row.new_assignment_id;
  return null;
}

/**
 * Every decision_log row, joined with order_type, the explanation (if any)
 * that was shown for the relevant assignment, and decision latency (see
 * metricsService.computeDecisionLatencies) where this row is the one that
 * latency was measured against. Built for pulling data out for analysis —
 * nothing here is used by the app's own UI.
 */
function buildDecisionExportRows() {
  const rows = decisionLogRepository.listAllWithOrderType();
  const latencyByDecisionId = new Map(computeDecisionLatencies(rows).map(l => [l.decisionId, l.latencySeconds]));

  // One batched query for every explanation this export needs, instead of
  // one findByAssignmentId() call per row — an export with N decision_log
  // rows previously ran up to N extra SQL queries just for this join.
  const relevantAssignmentIds = rows.map(relevantAssignmentId).filter(id => id !== null);
  const explanationsByAssignmentId = explanationRepository.findByAssignmentIds(relevantAssignmentIds);

  return rows.map(row => {
    const assignmentId = relevantAssignmentId(row);
    const explanation = assignmentId ? explanationsByAssignmentId.get(assignmentId) : undefined;

    return {
      decisionId: row.id,
      orderId: row.order_id,
      orderType: row.order_type,
      action: row.action,
      previousAssignmentId: row.previous_assignment_id,
      newAssignmentId: row.new_assignment_id,
      reasonText: row.reason_text,
      createdAt: row.created_at,
      explanationSource: explanation ? explanation.source : null,
      explanationConfidence: explanation ? explanation.confidence : null,
      decisionLatencySeconds: latencyByDecisionId.has(row.id) ? latencyByDecisionId.get(row.id) : null,
    };
  });
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(rows) {
  const header = CSV_COLUMNS.join(',');
  const lines = rows.map(row => CSV_COLUMNS.map(col => csvEscape(row[col])).join(','));
  return [header, ...lines].join('\n') + '\n';
}

module.exports = { buildDecisionExportRows, toCsv, CSV_COLUMNS };
