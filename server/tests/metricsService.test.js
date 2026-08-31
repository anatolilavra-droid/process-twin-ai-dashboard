const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');

const tmpDbPath = path.join(
  os.tmpdir(),
  `process-twin-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
);
process.env.DB_PATH = tmpDbPath;

const Database = require('better-sqlite3');
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
const setupDb = new Database(tmpDbPath);
for (const file of fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()) {
  setupDb.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
}
setupDb.close();

const specialistRepository = require('../repositories/specialistRepository');
const orderRepository = require('../repositories/orderRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const decisionLogRepository = require('../repositories/decisionLogRepository');
const { computeMetrics, computeDecisionLatencies } = require('../services/metricsService');

afterAll(() => {
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(tmpDbPath + '-wal', { force: true });
  fs.rmSync(tmpDbPath + '-shm', { force: true });
});

function makeOrder({ deadlineAt, estimatedHours }) {
  const id = randomUUID();
  orderRepository.create({
    id,
    orderType: 'standard',
    requiredSpecialistType: 'electrician',
    estimatedHours,
    requiresEquipment: false,
    createdAt: '2026-08-30T09:00:00.000Z',
    deadlineAt,
  });
  return id;
}

describe('computeMetrics on an empty DB', () => {
  it('returns nulls instead of dividing by zero', () => {
    const metrics = computeMetrics();
    expect(metrics.plannedOnTimeRate).toBeNull();
    expect(metrics.avgProcessingHours).toBeNull();
    expect(metrics.overrideRate).toBeNull();
    expect(metrics.avgDecisionLatencySeconds).toBeNull();
    expect(metrics.sampleSize).toEqual({
      currentAssignments: 0,
      aiProposedDecisions: 0,
      humanAcceptedDecisions: 0,
      humanOverriddenDecisions: 0,
      decisionsWithLatency: 0,
    });
  });
});

describe('computeMetrics with real data', () => {
  let specialistId;

  beforeAll(() => {
    specialistId = randomUUID();
    specialistRepository.create({ id: specialistId, name: 'Martin', specialistType: 'electrician', hoursPerDay: 8 });

    // One on-time (planned_end well before deadline) and one late (planned_end after deadline).
    const onTimeOrderId = makeOrder({ deadlineAt: '2026-08-31T09:00:00.000Z', estimatedHours: 2 });
    const lateOrderId = makeOrder({ deadlineAt: '2026-08-30T10:00:00.000Z', estimatedHours: 4 });

    const onTimeAssignment = assignmentRepository.create({
      id: randomUUID(),
      orderId: onTimeOrderId,
      specialistId,
      plannedStart: '2026-08-30T09:00:00.000Z',
      plannedEnd: '2026-08-30T11:00:00.000Z',
      createdBy: 'ai',
      createdAt: '2026-08-30T09:00:00.000Z',
    });
    const lateAssignment = assignmentRepository.create({
      id: randomUUID(),
      orderId: lateOrderId,
      specialistId,
      plannedStart: '2026-08-30T09:00:00.000Z',
      plannedEnd: '2026-08-30T13:00:00.000Z',
      createdBy: 'ai',
      createdAt: '2026-08-30T09:00:00.000Z',
    });

    decisionLogRepository.create({
      id: randomUUID(),
      orderId: onTimeOrderId,
      action: 'ai_proposed',
      newAssignmentId: onTimeAssignment.id,
      createdAt: '2026-08-30T09:00:00.000Z',
    });
    decisionLogRepository.create({
      id: randomUUID(),
      orderId: lateOrderId,
      action: 'ai_proposed',
      newAssignmentId: lateAssignment.id,
      createdAt: '2026-08-30T09:00:00.000Z',
    });
    decisionLogRepository.create({
      id: randomUUID(),
      orderId: lateOrderId,
      action: 'human_overridden',
      previousAssignmentId: lateAssignment.id,
      newAssignmentId: lateAssignment.id, // fine for this test: only counts matter, not referential realism
      reasonText: 'test',
      createdAt: '2026-08-30T09:05:00.000Z',
    });
  });

  it('computes plannedOnTimeRate from real assignment/deadline data', () => {
    const metrics = computeMetrics();
    expect(metrics.plannedOnTimeRate).toBeCloseTo(0.5);
  });

  it('computes avgProcessingHours as the mean estimated_hours of current assignments', () => {
    const metrics = computeMetrics();
    expect(metrics.avgProcessingHours).toBeCloseTo(3); // (2 + 4) / 2
  });

  it('computes overrideRate as human_overridden / ai_proposed', () => {
    const metrics = computeMetrics();
    expect(metrics.overrideRate).toBeCloseTo(0.5); // 1 override / 2 proposals
  });

  it('reports sample sizes alongside the rates', () => {
    const metrics = computeMetrics();
    expect(metrics.sampleSize).toEqual({
      currentAssignments: 2,
      aiProposedDecisions: 2,
      humanAcceptedDecisions: 0,
      humanOverriddenDecisions: 1,
      decisionsWithLatency: 1, // only lateOrderId got a human decision; onTimeOrderId is still just ai_proposed
    });
  });

  it('computes avgDecisionLatencySeconds from the one order that got a human decision (09:00 -> 09:05 = 300s)', () => {
    const metrics = computeMetrics();
    expect(metrics.avgDecisionLatencySeconds).toBeCloseTo(300);
  });
});

describe('computeDecisionLatencies (pure function, no DB)', () => {
  it('pairs the first ai_proposed with the first human decision that follows, in seconds', () => {
    const rows = [
      { id: 'd1', order_id: 'o1', action: 'ai_proposed', created_at: '2026-08-30T09:00:00.000Z' },
      { id: 'd2', order_id: 'o1', action: 'human_accepted', created_at: '2026-08-30T09:01:30.000Z' },
    ];
    expect(computeDecisionLatencies(rows)).toEqual([
      { orderId: 'o1', decisionId: 'd2', action: 'human_accepted', latencySeconds: 90 },
    ]);
  });

  it('skips an order that was only ever proposed, never decided', () => {
    const rows = [{ id: 'd1', order_id: 'o1', action: 'ai_proposed', created_at: '2026-08-30T09:00:00.000Z' }];
    expect(computeDecisionLatencies(rows)).toEqual([]);
  });

  it('uses only the FIRST human decision in a re-override chain, not the second', () => {
    const rows = [
      { id: 'd1', order_id: 'o1', action: 'ai_proposed', created_at: '2026-08-30T09:00:00.000Z' },
      { id: 'd2', order_id: 'o1', action: 'human_overridden', created_at: '2026-08-30T09:02:00.000Z' },
      { id: 'd3', order_id: 'o1', action: 'human_overridden', created_at: '2026-08-30T09:10:00.000Z' },
    ];
    const result = computeDecisionLatencies(rows);
    expect(result).toHaveLength(1);
    expect(result[0].decisionId).toBe('d2'); // the 09:10 re-override (d3) is not counted a second time
    expect(result[0].latencySeconds).toBe(120);
  });
});
