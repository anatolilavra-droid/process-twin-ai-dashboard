const assignmentRepository = require('../repositories/assignmentRepository');
const decisionLogRepository = require('../repositories/decisionLogRepository');

/**
 * The three metrics from CLAUDE.md ("% заказов в дедлайн, среднее время
 * обработки, доля override"), computed only from data this prototype
 * actually tracks — there is no "mark an order done" action anywhere in
 * the app, so orders never carry a real completion timestamp. Rather than
 * invent one, `plannedOnTimeRate` is honestly a *prospective* measure:
 * of currently-planned assignments, the share whose planned_end is still
 * before the order's deadline. It answers "is the current plan on track",
 * not "did work finish on time" — those are different claims and the field
 * name says which one this is.
 */
/**
 * For each order, the time between its first `ai_proposed` decision and the
 * first human decision (accept or override) that follows — i.e. how long
 * the operator took to make their first call on the AI's proposal. Computed
 * entirely from decision_log.created_at, which was already being recorded
 * for every decision; no new instrumentation needed.
 *
 * Deliberately simple: only the *first* human decision per order counts.
 * An order re-overridden more than once (see docs/spec.md's overrideRate
 * caveat) only contributes its first accept-or-override latency here — this
 * does not attempt to measure "time to re-decide" on a second override.
 *
 * `rows` must be pre-sorted by (order_id, created_at) — listAllWithOrderType()
 * does this in SQL so this function doesn't have to.
 */
function computeDecisionLatencies(rows) {
  const byOrder = new Map();
  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id).push(row);
  }

  const latencies = [];
  for (const orderRows of byOrder.values()) {
    const proposed = orderRows.find(r => r.action === 'ai_proposed');
    if (!proposed) continue;
    const decided = orderRows.find(r => r.action === 'human_accepted' || r.action === 'human_overridden');
    if (!decided) continue;

    const latencySeconds = (new Date(decided.created_at).getTime() - new Date(proposed.created_at).getTime()) / 1000;
    // decisionId identifies exactly which decision_log row this latency belongs
    // to — needed by the CSV/JSON export (services/exportService.js) to attach
    // it to the right row rather than guessing by order+action, which would be
    // ambiguous for a re-override chain (see the "FIRST human decision" test).
    latencies.push({ orderId: proposed.order_id, decisionId: decided.id, action: decided.action, latencySeconds });
  }
  return latencies;
}

function computeMetrics() {
  const currentEntries = assignmentRepository.listCurrentWithDetails();

  const onTimeCount = currentEntries.filter(
    entry => new Date(entry.planned_end).getTime() <= new Date(entry.deadline_at).getTime()
  ).length;
  const plannedOnTimeRate = currentEntries.length ? onTimeCount / currentEntries.length : null;

  const avgProcessingHours = currentEntries.length
    ? currentEntries.reduce((sum, entry) => sum + entry.estimated_hours, 0) / currentEntries.length
    : null;

  const actionCounts = decisionLogRepository.countsByAction();
  const overrideRate =
    actionCounts.ai_proposed > 0 ? actionCounts.human_overridden / actionCounts.ai_proposed : null;

  const latencies = computeDecisionLatencies(decisionLogRepository.listAllWithOrderType());
  const avgDecisionLatencySeconds = latencies.length
    ? latencies.reduce((sum, l) => sum + l.latencySeconds, 0) / latencies.length
    : null;

  return {
    plannedOnTimeRate,
    avgProcessingHours,
    overrideRate,
    avgDecisionLatencySeconds,
    sampleSize: {
      currentAssignments: currentEntries.length,
      aiProposedDecisions: actionCounts.ai_proposed,
      humanAcceptedDecisions: actionCounts.human_accepted,
      humanOverriddenDecisions: actionCounts.human_overridden,
      decisionsWithLatency: latencies.length,
    },
  };
}

module.exports = { computeMetrics, computeDecisionLatencies };
