const express = require('express');
const cors = require('cors');
const ordersRouter = require('./routes/orders');
const specialistsRouter = require('./routes/specialists');
const scheduleRouter = require('./routes/schedule');
const assignmentsRouter = require('./routes/assignments');
const decisionsRouter = require('./routes/decisions');
const metricsRouter = require('./routes/metrics');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  // No auth on this API yet (see README "Known limitations") — permissive
  // CORS is an acceptable prototype default, not a production posture.
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/orders', ordersRouter);
  app.use('/api/specialists', specialistsRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/decisions', decisionsRouter);
  app.use('/api/metrics', metricsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
