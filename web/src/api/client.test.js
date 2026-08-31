import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  acceptAssignment,
  generateOrders,
  getMetrics,
  listDecisions,
  listOrders,
  overrideAssignment,
  runSchedule,
} from './client';

function mockFetchOnce(status, body) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('api client', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hits the default localhost base URL when VITE_API_BASE_URL is unset', async () => {
    mockFetchOnce(200, { status: 'ok' });
    await getMetrics();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/metrics',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
  });

  it('POSTs the count and referenceTime for generateOrders', async () => {
    mockFetchOnce(200, { created: 5 });
    await generateOrders({ count: 5, referenceTime: '2026-08-31T00:00:00.000Z' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ count: 5, referenceTime: '2026-08-31T00:00:00.000Z' });
  });

  it('builds a query string from only the provided listOrders filters', async () => {
    mockFetchOnce(200, []);
    await listOrders({ status: 'queued' });
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:3001/api/orders?status=queued');
  });

  it('omits the query string entirely when listOrders is called with no filters', async () => {
    mockFetchOnce(200, []);
    await listOrders();
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:3001/api/orders');
  });

  it('builds listDecisions query params from orderId/limit/offset', async () => {
    mockFetchOnce(200, []);
    await listDecisions({ orderId: 'abc', limit: 10, offset: 0 });
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:3001/api/decisions?orderId=abc&limit=10&offset=0');
  });

  it('sends an empty JSON body for runSchedule', async () => {
    mockFetchOnce(200, { assignments: [] });
    await runSchedule();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{}');
  });

  it('POSTs accept with no body', async () => {
    mockFetchOnce(200, { ok: true });
    await acceptAssignment('assignment-1');
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/assignments/assignment-1/accept');
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
  });

  it('POSTs override with the specialist/time/reason payload', async () => {
    mockFetchOnce(200, { ok: true });
    await overrideAssignment('assignment-1', {
      specialistId: 'spec-2',
      plannedStart: '2026-08-31T10:00:00.000Z',
      plannedEnd: '2026-08-31T12:00:00.000Z',
      reason: 'closer to the customer',
    });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/assignments/assignment-1/override');
    expect(JSON.parse(options.body)).toEqual({
      specialistId: 'spec-2',
      plannedStart: '2026-08-31T10:00:00.000Z',
      plannedEnd: '2026-08-31T12:00:00.000Z',
      reason: 'closer to the customer',
    });
  });

  it('throws an ApiError carrying status/code/message on a non-2xx response', async () => {
    mockFetchOnce(404, { error: 'not_found', message: 'Order not found' });
    await expect(getMetrics()).rejects.toBeInstanceOf(ApiError);
    mockFetchOnce(404, { error: 'not_found', message: 'Order not found' });
    await expect(getMetrics()).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'Order not found',
    });
  });

  it('falls back to a generic message when the error body has no message', async () => {
    mockFetchOnce(500, null);
    await expect(listOrders()).rejects.toThrow('Request to /api/orders failed with 500');
  });
});
