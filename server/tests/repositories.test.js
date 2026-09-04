/**
 * Runs against a real temp-file SQLite DB via the actual migrations
 * (not a mock schema) — mirrors the pattern used in the sibling
 * openai-chat-sessions-service repo's tests/api.test.js.
 */

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
const explanationRepository = require('../repositories/explanationRepository');

afterAll(() => {
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(tmpDbPath + '-wal', { force: true });
  fs.rmSync(tmpDbPath + '-shm', { force: true });
});

describe('specialistRepository', () => {
  it('creates and finds a specialist', () => {
    const id = randomUUID();
    specialistRepository.create({ id, name: 'Martin', specialistType: 'electrician', hoursPerDay: 8 });
    expect(specialistRepository.findById(id)).toMatchObject({ id, name: 'Martin', specialist_type: 'electrician' });
  });

  it('lists specialists ordered by name', () => {
    const names = specialistRepository.list().map(s => s.name);
    expect(names).toEqual([...names].sort());
  });
});

describe('orderRepository', () => {
  it('creates an order with default status queued', () => {
    const id = randomUUID();
    const order = orderRepository.create({
      id,
      orderType: 'urgent',
      requiredSpecialistType: 'electrician',
      estimatedHours: 2,
      requiresEquipment: false,
      createdAt: '2026-08-30T09:00:00.000Z',
      deadlineAt: '2026-08-30T13:00:00.000Z',
    });
    expect(order.status).toBe('queued');
    expect(order.requires_equipment).toBe(0);
  });

  it('rejects an invalid order_type', () => {
    expect(() =>
      orderRepository.create({
        id: randomUUID(),
        orderType: 'not-a-real-type',
        requiredSpecialistType: 'electrician',
        estimatedHours: 1,
        requiresEquipment: false,
        createdAt: '2026-08-30T09:00:00.000Z',
        deadlineAt: '2026-08-30T10:00:00.000Z',
      })
    ).toThrow();
  });

  it('updates status and filters list by it', () => {
    const id = randomUUID();
    orderRepository.create({
      id,
      orderType: 'premium',
      requiredSpecialistType: 'technician',
      estimatedHours: 3,
      requiresEquipment: true,
      createdAt: '2026-08-30T09:00:00.000Z',
      deadlineAt: '2026-08-31T09:00:00.000Z',
    });
    orderRepository.updateStatus(id, 'in_progress');
    const inProgress = orderRepository.list({ status: 'in_progress' });
    expect(inProgress.map(o => o.id)).toContain(id);
  });
});

describe('assignmentRepository', () => {
  it('creates an assignment and enforces one current assignment per order', () => {
    const specialistId = randomUUID();
    specialistRepository.create({ id: specialistId, name: 'Anna', specialistType: 'technician', hoursPerDay: 8 });

    const orderId = randomUUID();
    orderRepository.create({
      id: orderId,
      orderType: 'standard',
      requiredSpecialistType: 'technician',
      estimatedHours: 1,
      requiresEquipment: false,
      createdAt: '2026-08-30T09:00:00.000Z',
      deadlineAt: '2026-08-30T12:00:00.000Z',
    });

    assignmentRepository.create({
      id: randomUUID(),
      orderId,
      specialistId,
      plannedStart: '2026-08-30T09:00:00.000Z',
      plannedEnd: '2026-08-30T10:00:00.000Z',
      createdBy: 'ai',
      createdAt: '2026-08-30T09:00:00.000Z',
    });

    expect(assignmentRepository.findCurrentByOrderId(orderId)).toBeTruthy();

    // A second is_current=1 row for the same order must violate the unique index —
    // overriding must first supersede the old row (that's PT-05/decisionService's job).
    expect(() =>
      assignmentRepository.create({
        id: randomUUID(),
        orderId,
        specialistId,
        plannedStart: '2026-08-30T10:00:00.000Z',
        plannedEnd: '2026-08-30T11:00:00.000Z',
        createdBy: 'human',
        createdAt: '2026-08-30T10:00:00.000Z',
      })
    ).toThrow();
  });
});

describe('explanationRepository', () => {
  function seedAssignment() {
    const specialistId = randomUUID();
    specialistRepository.create({ id: specialistId, name: 'Jonas', specialistType: 'generalist', hoursPerDay: 8 });

    const orderId = randomUUID();
    orderRepository.create({
      id: orderId,
      orderType: 'standard',
      requiredSpecialistType: 'generalist',
      estimatedHours: 1,
      requiresEquipment: false,
      createdAt: '2026-08-30T09:00:00.000Z',
      deadlineAt: '2026-08-30T12:00:00.000Z',
    });

    const assignmentId = randomUUID();
    assignmentRepository.create({
      id: assignmentId,
      orderId,
      specialistId,
      plannedStart: '2026-08-30T09:00:00.000Z',
      plannedEnd: '2026-08-30T10:00:00.000Z',
      createdBy: 'ai',
      createdAt: '2026-08-30T09:00:00.000Z',
    });
    return assignmentId;
  }

  it('creates an explanation and reads it back with parsed factors', () => {
    const assignmentId = seedAssignment();
    const created = explanationRepository.create({
      id: randomUUID(),
      assignmentId,
      factors: { topFactors: [{ factor: 'deadline', description: 'x', impact: 'high' }] },
      summaryText: 'Assigned based on deadline.',
      confidence: 'high',
      source: 'llm',
      createdAt: '2026-08-30T09:05:00.000Z',
    });
    expect(created.factors).toEqual({ topFactors: [{ factor: 'deadline', description: 'x', impact: 'high' }] });
    expect(explanationRepository.findByAssignmentId(assignmentId).summary_text).toBe('Assigned based on deadline.');
  });

  // Regression test for a real race: GET /api/orders/:id/explanation reads
  // the cache, and on a miss, generates + persists. Two concurrent requests
  // for the same not-yet-cached assignment (double-click, two open tabs)
  // both see no cached row and both try to INSERT — assignment_id is
  // UNIQUE, so the second insert used to bubble a raw SQLITE_CONSTRAINT_UNIQUE
  // error up to a 500 instead of just serving the first request's row.
  it('does not throw when a second create() races the same assignment_id, and returns the first row', () => {
    const assignmentId = seedAssignment();
    const first = explanationRepository.create({
      id: randomUUID(),
      assignmentId,
      factors: { topFactors: [] },
      summaryText: 'First writer wins.',
      confidence: 'high',
      source: 'llm',
      createdAt: '2026-08-30T09:05:00.000Z',
    });

    const second = explanationRepository.create({
      id: randomUUID(),
      assignmentId,
      factors: { topFactors: [] },
      summaryText: 'Second writer loses the race.',
      confidence: 'high',
      source: 'llm',
      createdAt: '2026-08-30T09:05:01.000Z',
    });

    expect(second.id).toBe(first.id);
    expect(second.summary_text).toBe('First writer wins.');
  });

  // findByAssignmentIds is the batched read exportService.js uses instead of
  // one findByAssignmentId() call per decision_log row — this is its only
  // direct test, since the export tests in api.test.js only check the final
  // output, not that the batching itself is correct.
  describe('findByAssignmentIds', () => {
    it('returns a Map keyed by assignment_id, one entry per assignment that has an explanation', () => {
      const assignmentA = seedAssignment();
      const assignmentB = seedAssignment();
      const assignmentC = seedAssignment(); // deliberately left without an explanation

      explanationRepository.create({
        id: randomUUID(),
        assignmentId: assignmentA,
        factors: { topFactors: [] },
        summaryText: 'A',
        confidence: 'high',
        source: 'llm',
        createdAt: '2026-08-30T09:05:00.000Z',
      });
      explanationRepository.create({
        id: randomUUID(),
        assignmentId: assignmentB,
        factors: { topFactors: [] },
        summaryText: 'B',
        confidence: 'low',
        source: 'fallback',
        createdAt: '2026-08-30T09:06:00.000Z',
      });

      const result = explanationRepository.findByAssignmentIds([assignmentA, assignmentB, assignmentC]);

      expect(result.size).toBe(2);
      expect(result.get(assignmentA).summary_text).toBe('A');
      expect(result.get(assignmentB).source).toBe('fallback');
      expect(result.has(assignmentC)).toBe(false);
    });

    it('deduplicates repeated ids into a single query and still returns one entry', () => {
      const assignmentId = seedAssignment();
      explanationRepository.create({
        id: randomUUID(),
        assignmentId,
        factors: { topFactors: [] },
        summaryText: 'Only one row expected',
        confidence: 'medium',
        source: 'llm',
        createdAt: '2026-08-30T09:05:00.000Z',
      });

      const result = explanationRepository.findByAssignmentIds([assignmentId, assignmentId, assignmentId]);

      expect(result.size).toBe(1);
      expect(result.get(assignmentId).summary_text).toBe('Only one row expected');
    });

    it('returns an empty Map for an empty input without querying the database', () => {
      expect(explanationRepository.findByAssignmentIds([])).toEqual(new Map());
    });
  });
});
