const { planSchedule } = require('../services/schedulingService');

const REFERENCE_TIME = '2026-08-30T09:00:00.000Z';

function specialist(id, type) {
  return { id, specialist_type: type, name: id, hours_per_day: 8 };
}

function order(id, { type = 'standard', specialistType = 'electrician', hours = 2, deadlineHours = 24 } = {}) {
  return {
    id,
    order_type: type,
    required_specialist_type: specialistType,
    estimated_hours: hours,
    deadline_at: new Date(new Date(REFERENCE_TIME).getTime() + deadlineHours * 3600000).toISOString(),
  };
}

describe('planSchedule', () => {
  it('assigns each order to a specialist of the required type', () => {
    const specialists = [specialist('s1', 'electrician'), specialist('s2', 'technician')];
    const orders = [
      order('o1', { specialistType: 'electrician' }),
      order('o2', { specialistType: 'technician' }),
    ];

    const { assignments, unscheduled } = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });

    expect(unscheduled).toHaveLength(0);
    expect(assignments).toHaveLength(2);
    expect(assignments.find(a => a.orderId === 'o1').specialistId).toBe('s1');
    expect(assignments.find(a => a.orderId === 'o2').specialistId).toBe('s2');
  });

  it('never overlaps two orders on the same specialist', () => {
    const specialists = [specialist('s1', 'electrician')];
    const orders = [
      order('o1', { specialistType: 'electrician', hours: 3 }),
      order('o2', { specialistType: 'electrician', hours: 2 }),
      order('o3', { specialistType: 'electrician', hours: 4 }),
    ];

    const { assignments } = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });
    const sorted = [...assignments].sort((a, b) => new Date(a.plannedStart) - new Date(b.plannedStart));

    for (let i = 1; i < sorted.length; i++) {
      expect(new Date(sorted[i].plannedStart).getTime()).toBeGreaterThanOrEqual(
        new Date(sorted[i - 1].plannedEnd).getTime()
      );
    }
  });

  it('schedules urgent and premium orders before standard/warranty when deadlines are equal', () => {
    const specialists = [specialist('s1', 'electrician')];
    // Same deadline for all four — only the type priority bonus should decide order.
    const orders = [
      order('standard', { type: 'standard', specialistType: 'electrician', deadlineHours: 48 }),
      order('warranty', { type: 'warranty', specialistType: 'electrician', deadlineHours: 48 }),
      order('urgent', { type: 'urgent', specialistType: 'electrician', deadlineHours: 48 }),
      order('premium', { type: 'premium', specialistType: 'electrician', deadlineHours: 48 }),
    ];

    const { assignments } = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });
    const orderIds = assignments.map(a => a.orderId);

    expect(orderIds.indexOf('urgent')).toBeLessThan(orderIds.indexOf('premium'));
    expect(orderIds.indexOf('premium')).toBeLessThan(orderIds.indexOf('standard'));
    // standard vs warranty tie (equal bonus) resolved by stable sort => original array order preserved
    expect(orderIds.indexOf('standard')).toBeLessThan(orderIds.indexOf('warranty'));
  });

  it('leaves an order unscheduled when no specialist matches its required type', () => {
    const specialists = [specialist('s1', 'electrician')];
    const orders = [order('o1', { specialistType: 'plumber' })];

    const { assignments, unscheduled } = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });

    expect(assignments).toHaveLength(0);
    expect(unscheduled).toEqual([{ orderId: 'o1', reason: 'no_matching_specialist' }]);
  });

  it('is deterministic for the same input', () => {
    const specialists = [specialist('s1', 'electrician'), specialist('s2', 'electrician')];
    const orders = [
      order('o1', { specialistType: 'electrician', deadlineHours: 10 }),
      order('o2', { specialistType: 'electrician', deadlineHours: 5 }),
      order('o3', { specialistType: 'electrician', deadlineHours: 20 }),
    ];

    const run1 = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });
    const run2 = planSchedule(orders, specialists, { referenceTime: REFERENCE_TIME });

    expect(run1).toEqual(run2);
  });
});
