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

  return {
    plannedOnTimeRate,
    avgProcessingHours,
    overrideRate,
    sampleSize: {
      currentAssignments: currentEntries.length,
      aiProposedDecisions: actionCounts.ai_proposed,
      humanAcceptedDecisions: actionCounts.human_accepted,
      humanOverriddenDecisions: actionCounts.human_overridden,
    },
  };
}

module.exports = { computeMetrics };
