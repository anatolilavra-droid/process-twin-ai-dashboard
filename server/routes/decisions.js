const express = require('express');
const decisionController = require('../controllers/decisionController');

const router = express.Router();

router.get('/export', decisionController.exportDecisions);
router.get('/', decisionController.listDecisions);

module.exports = router;
