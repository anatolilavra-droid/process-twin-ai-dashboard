const { ValidationError } = require('./errors');

// Mirrors the CHECK constraint in db/migrations/002_orders.sql.
const ORDER_STATUSES = ['queued', 'scheduled', 'in_progress', 'done', 'overdue'];

function validateGenerateOrdersBody(body = {}) {
  const count = body.count === undefined ? 10 : Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new ValidationError('COUNT_INVALID', 'Field "count" must be an integer between 1 and 200');
  }

  if (body.referenceTime !== undefined) {
    const parsed = new Date(body.referenceTime);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('REFERENCE_TIME_INVALID', 'Field "referenceTime" must be a valid ISO date string');
    }
  }

  return { count, referenceTime: body.referenceTime };
}

function validateListOrdersQuery(query = {}) {
  if (query.status !== undefined && !ORDER_STATUSES.includes(query.status)) {
    throw new ValidationError(
      'STATUS_INVALID',
      `Query param "status" must be one of: ${ORDER_STATUSES.join(', ')}`
    );
  }
  return { status: query.status };
}

module.exports = { validateGenerateOrdersBody, validateListOrdersQuery, ORDER_STATUSES };
