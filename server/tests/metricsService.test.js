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
const { computeMetrics } = require('../services/metricsService');

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
    expect(metrics.sampleSize).toEqual({
      currentAssignments: 0,
      aiProposedDecisions: 0,
      humanAcceptedDecisions: 0,
      humanOverriddenDecisions: 0,
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
    });
  });
});
