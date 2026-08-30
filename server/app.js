const express = require('express');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
