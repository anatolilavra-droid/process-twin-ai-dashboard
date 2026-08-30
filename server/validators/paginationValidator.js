const { ValidationError } = require('./errors');

function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  let limit = defaultLimit;
  let offset = 0;

  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
      throw new ValidationError(
        'LIMIT_INVALID',
        `Query param "limit" must be an integer between 1 and ${maxLimit}`
      );
    }
  }

  if (query.offset !== undefined) {
    offset = Number(query.offset);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError('OFFSET_INVALID', 'Query param "offset" must be a non-negative integer');
    }
  }

  return { limit, offset };
}

module.exports = { parsePagination };
