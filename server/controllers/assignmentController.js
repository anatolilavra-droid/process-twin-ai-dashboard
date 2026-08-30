const decisionService = require('../services/decisionService');
const { serializeDecision, serializeScheduleEntry } = require('../services/serializers');
const assignmentRepository = require('../repositories/assignmentRepository');
const { validateOverrideBody } = require('../validators/decisionValidator');

function accept(req, res, next) {
  try {
    const decision = decisionService.acceptAssignment(req.params.id);
    res.status(200).json(serializeDecision(decision));
  } catch (err) {
    next(err);
  }
}

function override(req, res, next) {
  try {
    const body = validateOverrideBody(req.body);
    const { assignment, decision } = decisionService.overrideAssignment(req.params.id, body);

    const [entry] = assignmentRepository.listCurrentWithDetails().filter(e => e.assignment_id === assignment.id);

    res.status(200).json({
      assignment: entry ? serializeScheduleEntry(entry) : null,
      decision: serializeDecision(decision),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { accept, override };
