/**
 * Runs against a real temp-file SQLite DB via the actual migrations —
 * same pattern as repositories.test.js / metricsService.test.js.
 *
 * Focus: buildDecisionExportRows() was refactored from one
 * explanationRepository.findByAssignmentId() call per row to a single
 * batched findByAssignmentIds() call (see repositories.test.js for that
 * function's own tests). The risk in that kind of refactor is a Map
 * mix-up — row A silently getting row B's explanation. These tests use
 * two orders with two *different* explanations specifically to catch that.
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
const decisionLogRepository = require('../repositories/decisionLogRepository');
const explanationRepository = require('../repositories/explanationRepository');
const { buildDecisionExportRows, toCsv } = require('../services/exportService');

afterAll(() => {
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(tmpDbPath + '-wal', { force: true });
  fs.rmSync(tmpDbPath + '-shm', { force: true });
});

function seedOrderAcceptedWithExplanation({ summaryText, source, confidence }) {
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
  decisionLogRepository.create({
    id: randomUUID(),
    orderId,
    action: 'ai_proposed',
    newAssignmentId: assignmentId,
    createdAt: '2026-08-30T09:00:00.000Z',
  });

  explanationRepository.create({
    id: randomUUID(),
    assignmentId,
    factors: { topFactors: [] },
    summaryText,
    confidence,
    source,
    createdAt: '2026-08-30T09:00:30.000Z',
  });

  decisionLogRepository.create({
    id: randomUUID(),
    orderId,
    action: 'human_accepted',
    newAssignmentId: assignmentId,
    createdAt: '2026-08-30T09:05:00.000Z',
  });

  return { orderId, assignmentId };
}

describe('buildDecisionExportRows', () => {
  it('attaches each order its OWN explanation, not another order\'s (batched-lookup regression check)', () => {
    const orderA = seedOrderAcceptedWithExplanation({
      summaryText: 'Explanation for order A',
      source: 'llm',
      confidence: 'high',
    });
    const orderB = seedOrderAcceptedWithExplanation({
      summaryText: 'Explanation for order B',
      source: 'fallback',
      confidence: 'low',
    });

    const rows = buildDecisionExportRows();

    const acceptedA = rows.find(r => r.orderId === orderA.orderId && r.action === 'human_accepted');
    const acceptedB = rows.find(r => r.orderId === orderB.orderId && r.action === 'human_accepted');

    expect(acceptedA.explanationSource).toBe('llm');
    expect(acceptedA.explanationConfidence).toBe('high');
    expect(acceptedB.explanationSource).toBe('fallback');
    expect(acceptedB.explanationConfidence).toBe('low');

    // The ai_proposed row for each order has no decision attached to it yet,
    // so it must carry no explanation — not accidentally inherit one.
    const proposedA = rows.find(r => r.orderId === orderA.orderId && r.action === 'ai_proposed');
    expect(proposedA.explanationSource).toBeNull();
  });

  it('produces a valid CSV with one header row plus one row per decision_log entry', () => {
    const rows = buildDecisionExportRows();
    const csv = toCsv(rows);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('decisionId,orderId,orderType,action');
    expect(lines.length - 1).toBe(rows.length);
  });
});
