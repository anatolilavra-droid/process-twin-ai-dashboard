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

module.exports = { ValidationError, NotFoundError };
