const { randomUUID } = require('crypto');
const orderRepository = require('../repositories/orderRepository');
const specialistRepository = require('../repositories/specialistRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const explanationRepository = require('../repositories/explanationRepository');
const { generateSyntheticOrders } = require('../services/orderGeneratorService');
const { generateExplanation } = require('../services/explanationService');
const { serializeOrder, serializeExplanation } = require('../services/serializers');
const { validateGenerateOrdersBody, validateListOrdersQuery } = require('../validators/orderValidator');
const { parsePagination } = require('../validators/paginationValidator');
const { NotFoundError } = require('../validators/errors');

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

async function getExplanation(req, res, next) {
  try {
    const order = orderRepository.findById(req.params.id);
    if (!order) {
      throw new NotFoundError('ORDER_NOT_FOUND', `No order with id "${req.params.id}"`);
    }

    const assignment = assignmentRepository.findCurrentByOrderId(order.id);
    if (!assignment) {
      throw new NotFoundError('ORDER_NOT_SCHEDULED', 'This order has no current assignment yet — run the scheduler first');
    }

    const cached = explanationRepository.findByAssignmentId(assignment.id);
    if (cached) {
      return res.status(200).json(serializeExplanation(cached));
    }

    const specialist = specialistRepository.findById(assignment.specialist_id);
    const specialistAssignments = assignmentRepository
      .listCurrentWithDetails()
      .filter(entry => entry.specialist_id === specialist.id);

    const { explanation, rawFactors, source } = await generateExplanation({
      order,
      assignment,
      specialist,
      specialistAssignments,
    });

    const createdAt = new Date().toISOString();

    // Only persist real LLM explanations. A fallback means the LLM call
    // failed — caching it would lock the order into a degraded explanation
    // even after the LLM becomes reachable again, so the next request
    // should retry rather than read a stale fallback from the cache.
    if (source === 'fallback') {
      return res.status(200).json(
        serializeExplanation({
          assignment_id: assignment.id,
          factors: { topFactors: explanation.topFactors, rawFactors },
          summary_text: explanation.summaryText,
          confidence: explanation.confidence,
          source,
          created_at: createdAt,
        })
      );
    }

    const saved = explanationRepository.create({
      id: randomUUID(),
      assignmentId: assignment.id,
      factors: { topFactors: explanation.topFactors, rawFactors },
      summaryText: explanation.summaryText,
      confidence: explanation.confidence,
      source,
      createdAt,
    });

    res.status(200).json(serializeExplanation(saved));
  } catch (err) {
    next(err);
  }
}

module.exports = { generateOrders, listOrders, getExplanation };
