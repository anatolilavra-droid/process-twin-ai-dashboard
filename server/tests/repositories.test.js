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
