const { randomUUID } = require('crypto');
const db = require('../config/database');
const assignmentRepository = require('../repositories/assignmentRepository');
const decisionLogRepository = require('../repositories/decisionLogRepository');
const specialistRepository = require('../repositories/specialistRepository');
const { NotFoundError, ConflictError } = require('../validators/errors');

function requireCurrentAssignment(assignmentId) {
  const assignment = assignmentRepository.findById(assignmentId);
  if (!assignment) {
    throw new NotFoundError('ASSIGNMENT_NOT_FOUND', `No assignment with id "${assignmentId}"`);
  }
  if (!assignment.is_current) {
    throw new ConflictError('ASSIGNMENT_NOT_CURRENT', 'This assignment has already been superseded by a later decision');
  }
  return assignment;
}

function acceptAssignment(assignmentId) {
  const assignment = requireCurrentAssignment(assignmentId);
  const createdAt = new Date().toISOString();

  return decisionLogRepository.create({
    id: randomUUID(),
    orderId: assignment.order_id,
    action: 'human_accepted',
    previousAssignmentId: null,
    newAssignmentId: assignment.id,
    reasonText: null,
    createdAt,
  });
}

function overrideAssignment(assignmentId, { specialistId, plannedStart, plannedEnd, reason }) {
  const oldAssignment = requireCurrentAssignment(assignmentId);

  if (!specialistRepository.findById(specialistId)) {
    throw new NotFoundError('SPECIALIST_NOT_FOUND', `No specialist with id "${specialistId}"`);
  }

  const createdAt = new Date().toISOString();

  const run = db.transaction(() => {
    assignmentRepository.supersede(oldAssignment.id);
    const newAssignment = assignmentRepository.create({
      id: randomUUID(),
      orderId: oldAssignment.order_id,
      specialistId,
      plannedStart,
      plannedEnd,
      createdBy: 'human',
      createdAt,
    });
    const decision = decisionLogRepository.create({
      id: randomUUID(),
      orderId: oldAssignment.order_id,
      action: 'human_overridden',
      previousAssignmentId: oldAssignment.id,
      newAssignmentId: newAssignment.id,
      reasonText: reason,
      createdAt,
    });
    return { assignment: newAssignment, decision };
  });

  return run();
}

module.exports = { acceptAssignment, overrideAssignment };
