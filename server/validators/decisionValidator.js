const { ValidationError } = require('./errors');

function validateOverrideBody(body = {}) {
  if (typeof body.specialistId !== 'string' || body.specialistId.length === 0) {
    throw new ValidationError('SPECIALIST_ID_REQUIRED', 'Field "specialistId" is required');
  }

  const start = new Date(body.plannedStart);
  if (!body.plannedStart || Number.isNaN(start.getTime())) {
    throw new ValidationError('PLANNED_START_INVALID', 'Field "plannedStart" must be a valid ISO date string');
  }

  const end = new Date(body.plannedEnd);
  if (!body.plannedEnd || Number.isNaN(end.getTime())) {
    throw new ValidationError('PLANNED_END_INVALID', 'Field "plannedEnd" must be a valid ISO date string');
  }

  if (end.getTime() <= start.getTime()) {
    throw new ValidationError('PLANNED_RANGE_INVALID', '"plannedEnd" must be after "plannedStart"');
  }

  if (body.reason !== undefined && typeof body.reason !== 'string') {
    throw new ValidationError('REASON_INVALID_TYPE', 'Field "reason" must be a string');
  }

  return {
    specialistId: body.specialistId,
    plannedStart: start.toISOString(),
    plannedEnd: end.toISOString(),
    reason: body.reason,
  };
}

function validateListDecisionsQuery(query = {}) {
  if (query.orderId !== undefined && typeof query.orderId !== 'string') {
    throw new ValidationError('ORDER_ID_INVALID', 'Query param "orderId" must be a string');
  }
  return { orderId: query.orderId };
}

module.exports = { validateOverrideBody, validateListDecisionsQuery };
