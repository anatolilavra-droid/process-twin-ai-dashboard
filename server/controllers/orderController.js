const orderRepository = require('../repositories/orderRepository');
const { generateSyntheticOrders } = require('../services/orderGeneratorService');
const { serializeOrder } = require('../services/serializers');
const { validateGenerateOrdersBody, validateListOrdersQuery } = require('../validators/orderValidator');
const { parsePagination } = require('../validators/paginationValidator');

function generateOrders(req, res, next) {
  try {
    const { count, referenceTime } = validateGenerateOrdersBody(req.body);
    const orders = generateSyntheticOrders(count, referenceTime ? { referenceTime } : {});
    res.status(201).json(orders.map(serializeOrder));
  } catch (err) {
    next(err);
  }
}

function listOrders(req, res, next) {
  try {
    const { status } = validateListOrdersQuery(req.query);
    const { limit, offset } = parsePagination(req.query);
    const orders = orderRepository.list({ status, limit, offset });
    res.status(200).json(orders.map(serializeOrder));
  } catch (err) {
    next(err);
  }
}

module.exports = { generateOrders, listOrders };
