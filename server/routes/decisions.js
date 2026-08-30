const express = require('express');
const decisionController = require('../controllers/decisionController');

const router = express.Router();

router.get('/', decisionController.listDecisions);

module.exports = router;
