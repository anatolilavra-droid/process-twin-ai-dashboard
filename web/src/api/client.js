const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, body?.error, body?.message || `Request to ${path} failed with ${res.status}`);
  }

  return body;
}

function generateOrders({ count, referenceTime } = {}) {
  return request('/api/orders/generate', {
    method: 'POST',
    body: JSON.stringify({ count, referenceTime }),
  });
}

function listOrders({ status, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit !== undefined) params.set('limit', limit);
  if (offset !== undefined) params.set('offset', offset);
  const query = params.toString();
  return request(`/api/orders${query ? `?${query}` : ''}`);
}

function listSpecialists() {
  return request('/api/specialists');
}

function runSchedule() {
  return request('/api/schedule/run', { method: 'POST', body: JSON.stringify({}) });
}

function getSchedule() {
  return request('/api/schedule');
}

export { ApiError, generateOrders, listOrders, listSpecialists, runSchedule, getSchedule };
