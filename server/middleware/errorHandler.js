function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[${new Date().toISOString()}] ${err.name || 'Error'}: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.code || err.name || 'INTERNAL_ERROR',
    message: statusCode === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;
