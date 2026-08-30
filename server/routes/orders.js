const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.post('/generate', orderController.generateOrders);
router.get('/', orderController.listOrders);

module.exports = router;
