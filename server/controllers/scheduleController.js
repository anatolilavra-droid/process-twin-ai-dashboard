const { randomUUID } = require('crypto');
const db = require('../config/database');
const orderRepository = require('../repositories/orderRepository');
const specialistRepository = require('../repositories/specialistRepository');
const assignmentRepository = require('../repositories/assignmentRepository');
const decisionLogRepository = require('../repositories/decisionLogRepository');
const { planSchedule } = require('../services/schedulingService');
const { serializeScheduleEntry } = require('../services/serializers');

// Upper bound on how many queued orders one /schedule/run call will plan —
// generous for a research-prototype demo, not a claim about production scale.
const MAX_QUEUE_BATCH = 1000;

function runSchedule(req, res, next) {
  try {
    const queuedOrders = orderRepository.list({ status: 'queued', limit: MAX_QUEUE_BATCH });
    const specialists = specialistRepository.list();
    const { assignments, unscheduled } = planSchedule(queuedOrders, specialists);

    const createdAt = new Date().toISOString();
    const persist = db.transaction(() => {
      for (const assignment of assignments) {
        const created = assignmentRepository.create({
          id: randomUUID(),
          orderId: assignment.orderId,
          specialistId: assignment.specialistId,
          plannedStart: assignment.plannedStart,
          plannedEnd: assignment.plannedEnd,
          createdBy: 'ai',
          createdAt,
        });
        orderRepository.updateStatus(assignment.orderId, 'scheduled');
        decisionLogRepository.create({
          id: randomUUID(),
          orderId: assignment.orderId,
          action: 'ai_proposed',
          previousAssignmentId: null,
          newAssignmentId: created.id,
          reasonText: null,
          createdAt,
        });
      }
    });
    persist();

    const scheduledOrderIds = new Set(assignments.map(a => a.orderId));
    const newEntries = assignmentRepository
      .listCurrentWithDetails()
      .filter(entry => scheduledOrderIds.has(entry.order_id));

    res.status(200).json({
      scheduledCount: assignments.length,
      unscheduledCount: unscheduled.length,
      unscheduled,
      schedule: newEntries.map(serializeScheduleEntry),
    });
  } catch (err) {
    next(err);
  }
}

function getSchedule(req, res, next) {
  try {
    const entries = assignmentRepository.listCurrentWithDetails();
    res.status(200).json(entries.map(serializeScheduleEntry));
  } catch (err) {
    next(err);
  }
}

module.exports = { runSchedule, getSchedule };
