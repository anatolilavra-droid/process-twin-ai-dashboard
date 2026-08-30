const { computeMetrics } = require('../services/metricsService');

function getMetrics(req, res, next) {
  try {
    res.status(200).json(computeMetrics());
  } catch (err) {
    next(err);
  }
}

module.exports = { getMetrics };
