class ValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.statusCode = 404;
  }
}

class ConflictError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.statusCode = 409;
  }
}

module.exports = { ValidationError, NotFoundError, ConflictError };
