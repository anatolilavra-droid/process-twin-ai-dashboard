const express = require('express');
const scheduleController = require('../controllers/scheduleController');

const router = express.Router();

router.post('/run', scheduleController.runSchedule);
router.get('/', scheduleController.getSchedule);

module.exports = router;
