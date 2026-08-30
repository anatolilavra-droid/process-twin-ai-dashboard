// Earliest-deadline-first, with a per-type "priority bonus" that effectively
// pulls urgent/premium orders' deadlines forward for sorting purposes. This
// is the deterministic heuristic baseline described in CLAUDE.md — not a
// learned model, and it does not account for specialists' hours_per_day
// capacity or day/working-hours boundaries yet (known Stage A limitation:
// specialists are treated as available back-to-back from referenceTime).
const TYPE_PRIORITY_BONUS_HOURS = {
  urgent: 18,
  premium: 10,
  standard: 0,
  warranty: 0,
};

function effectivePriority(order, referenceTime) {
  const hoursUntilDeadline = (new Date(order.deadline_at).getTime() - referenceTime.getTime()) / 3600000;
  const bonus = TYPE_PRIORITY_BONUS_HOURS[order.order_type] || 0;
  return hoursUntilDeadline - bonus;
}

/**
 * Pure planning function — takes already-fetched orders/specialists rows,
 * returns a plan. Does not touch the database or generate ids; the caller
 * (PT-05's controller/service) is responsible for persisting the result via
 * assignmentRepository.
 */
function planSchedule(orders, specialists, options = {}) {
  const referenceTime = options.referenceTime ? new Date(options.referenceTime) : new Date();

  const prioritized = [...orders].sort(
    (a, b) => effectivePriority(a, referenceTime) - effectivePriority(b, referenceTime)
  );

  const nextAvailable = new Map();
  for (const specialist of specialists) {
    nextAvailable.set(specialist.id, referenceTime);
  }

  const assignments = [];
  const unscheduled = [];

  for (const order of prioritized) {
    const candidates = specialists.filter(s => s.specialist_type === order.required_specialist_type);
    if (candidates.length === 0) {
      unscheduled.push({ orderId: order.id, reason: 'no_matching_specialist' });
      continue;
    }

    let chosen = candidates[0];
    let chosenStart = nextAvailable.get(chosen.id);
    for (const candidate of candidates.slice(1)) {
      const start = nextAvailable.get(candidate.id);
      if (start.getTime() < chosenStart.getTime()) {
        chosen = candidate;
        chosenStart = start;
      }
    }

    const plannedEnd = new Date(chosenStart.getTime() + order.estimated_hours * 3600000);
    nextAvailable.set(chosen.id, plannedEnd);

    assignments.push({
      orderId: order.id,
      specialistId: chosen.id,
      plannedStart: chosenStart.toISOString(),
      plannedEnd: plannedEnd.toISOString(),
    });
  }

  return { assignments, unscheduled };
}

module.exports = { planSchedule, TYPE_PRIORITY_BONUS_HOURS };
