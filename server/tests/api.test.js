/**
 * Runs against a real temp-file SQLite DB via the actual migrations —
 * mirrors the pattern used in the sibling openai-chat-sessions-service
 * repo's tests/api.test.js. Covers the Stage A API surface end to end:
 * generate orders, list/filter/paginate, list specialists, run the
 * scheduler, read the resulting board.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');

// Explanations go through the LLM — mocked here so the API suite stays
// hermetic and doesn't depend on a live ANTHROPIC_API_KEY.
const mockParse = jest.fn();
jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({ messages: { parse: mockParse } }))
);

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

const request = require('supertest');
const createApp = require('../app');
const specialistRepository = require('../repositories/specialistRepository');

const app = createApp();

afterAll(() => {
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(tmpDbPath + '-wal', { force: true });
  fs.rmSync(tmpDbPath + '-shm', { force: true });
});

beforeAll(() => {
  specialistRepository.create({ id: randomUUID(), name: 'Martin', specialistType: 'electrician', hoursPerDay: 8 });
  specialistRepository.create({ id: randomUUID(), name: 'Anna', specialistType: 'technician', hoursPerDay: 8 });
});

describe('GET /api/specialists', () => {
  it('lists the seeded specialists, camelCased', async () => {
    const res = await request(app).get('/api/specialists');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ specialistType: expect.any(String), hoursPerDay: expect.any(Number) });
  });
});

describe('POST /api/orders/generate', () => {
  it('generates the requested number of orders', async () => {
    const res = await request(app).post('/api/orders/generate').send({ count: 15 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(15);
    expect(res.body[0]).toMatchObject({ status: 'queued', orderType: expect.any(String) });
  });

  it('rejects a count outside the allowed range', async () => {
    const res = await request(app).post('/api/orders/generate').send({ count: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('COUNT_INVALID');
  });

  it('rejects an invalid referenceTime', async () => {
    const res = await request(app).post('/api/orders/generate').send({ count: 1, referenceTime: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('REFERENCE_TIME_INVALID');
  });
});

describe('GET /api/orders', () => {
  it('filters by status', async () => {
    const res = await request(app).get('/api/orders').query({ status: 'queued', limit: 100 });
    expect(res.status).toBe(200);
    expect(res.body.every(o => o.status === 'queued')).toBe(true);
  });

  it('rejects an unknown status', async () => {
    const res = await request(app).get('/api/orders').query({ status: 'bogus' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('STATUS_INVALID');
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app).get('/api/orders').query({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('LIMIT_INVALID');
  });

  it('rejects a negative offset', async () => {
    const res = await request(app).get('/api/orders').query({ offset: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('OFFSET_INVALID');
  });
});

let scheduledOrderId;
let secondScheduledOrderId;
let scheduledAssignmentId;
let thirdScheduledOrderId;
let thirdScheduledAssignmentId;

describe('POST /api/schedule/run + GET /api/schedule', () => {
  it('schedules the queued orders and the board reflects it', async () => {
    const runRes = await request(app).post('/api/schedule/run').send({});
    expect(runRes.status).toBe(200);
    expect(runRes.body.scheduledCount).toBeGreaterThan(0);
    expect(runRes.body.schedule).toHaveLength(runRes.body.scheduledCount);

    scheduledOrderId = runRes.body.schedule[0].orderId;
    scheduledAssignmentId = runRes.body.schedule[0].assignmentId;
    secondScheduledOrderId = runRes.body.schedule[1]?.orderId;
    thirdScheduledOrderId = runRes.body.schedule[2]?.orderId;
    thirdScheduledAssignmentId = runRes.body.schedule[2]?.assignmentId;

    const boardRes = await request(app).get('/api/schedule');
    expect(boardRes.status).toBe(200);
    expect(boardRes.body.length).toBeGreaterThanOrEqual(runRes.body.scheduledCount);
    expect(boardRes.body[0]).toMatchObject({
      orderId: expect.any(String),
      specialistId: expect.any(String),
      plannedStart: expect.any(String),
      plannedEnd: expect.any(String),
    });

    const scheduledOrders = await request(app).get('/api/orders').query({ status: 'scheduled', limit: 200 });
    expect(scheduledOrders.body.length).toBe(runRes.body.scheduledCount);
  });
});

describe('GET /api/orders/:id/explanation', () => {
  afterEach(() => {
    mockParse.mockReset();
  });

  it('404s for an unknown order', async () => {
    const res = await request(app).get(`/api/orders/${randomUUID()}/explanation`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ORDER_NOT_FOUND');
  });

  it('returns an LLM explanation and caches it on the second call', async () => {
    const parsedOutput = {
      topFactors: [{ factor: 'deadline', description: 'Close deadline', impact: 'high' }],
      summaryText: 'Scheduled early because of its deadline.',
      confidence: 'high',
    };
    mockParse.mockResolvedValueOnce({ parsed_output: parsedOutput });

    const first = await request(app).get(`/api/orders/${scheduledOrderId}/explanation`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ summaryText: parsedOutput.summaryText, confidence: 'high', source: 'llm' });
    expect(mockParse).toHaveBeenCalledTimes(1);

    // Second call should hit the persisted cache, not call the LLM again.
    const second = await request(app).get(`/api/orders/${scheduledOrderId}/explanation`);
    expect(second.status).toBe(200);
    expect(second.body.summaryText).toBe(parsedOutput.summaryText);
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it('degrades to a fallback explanation (not cached) when the LLM call fails', async () => {
    if (!secondScheduledOrderId) return; // only >=2 orders got scheduled sometimes, skip if not

    mockParse.mockRejectedValueOnce(new Error('simulated outage'));

    const first = await request(app).get(`/api/orders/${secondScheduledOrderId}/explanation`);
    expect(first.status).toBe(200);
    expect(first.body.source).toBe('fallback');
    expect(first.body.confidence).toBe('low');

    // Not cached: a second call retries the LLM instead of reading a stale fallback.
    mockParse.mockResolvedValueOnce({
      parsed_output: { topFactors: [{ factor: 'deadline', description: 'x', impact: 'low' }], summaryText: 'ok', confidence: 'medium' },
    });
    const second = await request(app).get(`/api/orders/${secondScheduledOrderId}/explanation`);
    expect(second.status).toBe(200);
    expect(second.body.source).toBe('llm');
    expect(mockParse).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/assignments/:id/accept', () => {
  it('logs a human_accepted decision without changing the assignment', async () => {
    const res = await request(app).post(`/api/assignments/${scheduledAssignmentId}/accept`).send();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      orderId: scheduledOrderId,
      action: 'human_accepted',
      newAssignmentId: scheduledAssignmentId,
    });
  });

  it('404s for an unknown assignment', async () => {
    const res = await request(app).post(`/api/assignments/${randomUUID()}/accept`).send();
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ASSIGNMENT_NOT_FOUND');
  });

  it('409s for an assignment that was already superseded', async () => {
    // Accepting scheduledAssignmentId again is fine (accept doesn't supersede),
    // but overriding it below will supersede it — then accept must 409.
    if (!thirdScheduledAssignmentId) return;
    const specialists = await request(app).get('/api/specialists');
    const other = specialists.body[0];

    const overrideRes = await request(app)
      .post(`/api/assignments/${thirdScheduledAssignmentId}/override`)
      .send({
        specialistId: other.id,
        plannedStart: new Date(Date.now() + 3600000).toISOString(),
        plannedEnd: new Date(Date.now() + 7200000).toISOString(),
        reason: 'test setup',
      });
    expect(overrideRes.status).toBe(200);

    const acceptStale = await request(app).post(`/api/assignments/${thirdScheduledAssignmentId}/accept`).send();
    expect(acceptStale.status).toBe(409);
    expect(acceptStale.body.error).toBe('ASSIGNMENT_NOT_CURRENT');
  });
});

describe('POST /api/assignments/:id/override', () => {
  it('validates the body', async () => {
    const res = await request(app).post(`/api/assignments/${scheduledAssignmentId}/override`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SPECIALIST_ID_REQUIRED');
  });

  it('supersedes the old assignment, creates a new one, and logs the reason', async () => {
    const specialists = await request(app).get('/api/specialists');
    const target = specialists.body[0];

    const plannedStart = new Date(Date.now() + 3600000).toISOString();
    const plannedEnd = new Date(Date.now() + 7200000).toISOString();

    const res = await request(app)
      .post(`/api/assignments/${scheduledAssignmentId}/override`)
      .send({ specialistId: target.id, plannedStart, plannedEnd, reason: 'specialist was busy with another client' });

    expect(res.status).toBe(200);
    expect(res.body.assignment).toMatchObject({ specialistId: target.id, orderId: scheduledOrderId });
    expect(res.body.decision).toMatchObject({
      action: 'human_overridden',
      previousAssignmentId: scheduledAssignmentId,
      reasonText: 'specialist was busy with another client',
    });

    // The old assignment is no longer current — the board's single row for
    // this order must now be the new one.
    const board = await request(app).get('/api/schedule');
    const rowsForOrder = board.body.filter(e => e.orderId === scheduledOrderId);
    expect(rowsForOrder).toHaveLength(1);
    expect(rowsForOrder[0].assignmentId).toBe(res.body.assignment.assignmentId);
  });

  it('404s when the target specialist does not exist', async () => {
    if (!secondScheduledOrderId) return;
    const boardRes = await request(app).get('/api/schedule');
    const entry = boardRes.body.find(e => e.orderId === secondScheduledOrderId);
    if (!entry) return;

    const res = await request(app)
      .post(`/api/assignments/${entry.assignmentId}/override`)
      .send({
        specialistId: randomUUID(),
        plannedStart: new Date(Date.now() + 3600000).toISOString(),
        plannedEnd: new Date(Date.now() + 7200000).toISOString(),
      });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('SPECIALIST_NOT_FOUND');
  });
});

describe('GET /api/decisions', () => {
  it('lists decisions, most recent first, filterable by orderId', async () => {
    const res = await request(app).get('/api/decisions').query({ orderId: scheduledOrderId, limit: 50 });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // ai_proposed + human_overridden at least
    expect(res.body.every(d => d.orderId === scheduledOrderId)).toBe(true);
    const actions = res.body.map(d => d.action);
    expect(actions).toContain('ai_proposed');
    expect(actions).toContain('human_overridden');
  });

  it('returns decisions across all orders when orderId is omitted', async () => {
    const res = await request(app).get('/api/decisions').query({ limit: 200 });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
