const express = require('express');
const assignmentController = require('../controllers/assignmentController');

const router = express.Router();

router.post('/:id/accept', assignmentController.accept);
router.post('/:id/override', assignmentController.override);

module.exports = router;
