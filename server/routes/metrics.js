const express = require('express');
const metricsController = require('../controllers/metricsController');

const router = express.Router();

router.get('/', metricsController.getMetrics);

module.exports = router;
