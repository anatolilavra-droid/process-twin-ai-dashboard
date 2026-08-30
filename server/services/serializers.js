function serializeOrder(order) {
  return {
    id: order.id,
    orderType: order.order_type,
    requiredSpecialistType: order.required_specialist_type,
    estimatedHours: order.estimated_hours,
    requiresEquipment: !!order.requires_equipment,
    status: order.status,
    createdAt: order.created_at,
    deadlineAt: order.deadline_at,
  };
}

function serializeSpecialist(specialist) {
  return {
    id: specialist.id,
    name: specialist.name,
    specialistType: specialist.specialist_type,
    hoursPerDay: specialist.hours_per_day,
  };
}

function serializeScheduleEntry(row) {
  return {
    assignmentId: row.assignment_id,
    orderId: row.order_id,
    orderType: row.order_type,
    orderStatus: row.order_status,
    deadlineAt: row.deadline_at,
    estimatedHours: row.estimated_hours,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    specialistType: row.specialist_type,
    plannedStart: row.planned_start,
    plannedEnd: row.planned_end,
    createdBy: row.created_by,
  };
}

module.exports = { serializeOrder, serializeSpecialist, serializeScheduleEntry };
