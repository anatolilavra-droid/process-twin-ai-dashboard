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
const { generateSyntheticOrders, ORDER_TYPES, DEADLINE_WINDOW_HOURS } = require('../services/orderGeneratorService');

afterAll(() => {
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(tmpDbPath + '-wal', { force: true });
  fs.rmSync(tmpDbPath + '-shm', { force: true });
});

describe('generateSyntheticOrders', () => {
  it('throws when no specialists are seeded yet', () => {
    expect(() => generateSyntheticOrders(1)).toThrow(/seed/i);
  });

  describe('once specialists exist', () => {
    beforeAll(() => {
      specialistRepository.create({ id: randomUUID(), name: 'Martin', specialistType: 'electrician', hoursPerDay: 8 });
      specialistRepository.create({ id: randomUUID(), name: 'Anna', specialistType: 'technician', hoursPerDay: 8 });
    });

    it('creates exactly n orders, each with a required_specialist_type that exists', () => {
      const orders = generateSyntheticOrders(20);
      expect(orders).toHaveLength(20);
      const seededTypes = specialistRepository.list().map(s => s.specialist_type);
      for (const order of orders) {
        expect(seededTypes).toContain(order.required_specialist_type);
      }
    });

    it('covers all 4 order types over a large enough sample', () => {
      const orders = generateSyntheticOrders(200);
      const seenTypes = new Set(orders.map(o => o.order_type));
      expect([...seenTypes].sort()).toEqual([...ORDER_TYPES].sort());
    });

    it('keeps deadline_at within the type-specific window relative to referenceTime', () => {
      const referenceTime = '2026-08-30T09:00:00.000Z';
      const orders = generateSyntheticOrders(100, { referenceTime });
      const referenceMs = new Date(referenceTime).getTime();

      for (const order of orders) {
        const [minHours, maxHours] = DEADLINE_WINDOW_HOURS[order.order_type];
        const deadlineHours = (new Date(order.deadline_at).getTime() - referenceMs) / 3600000;
        expect(deadlineHours).toBeGreaterThanOrEqual(minHours);
        expect(deadlineHours).toBeLessThanOrEqual(maxHours);
        expect(order.created_at).toBe(referenceTime);
      }
    });
  });
});
