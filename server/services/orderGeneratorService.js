const { randomUUID } = require('crypto');
const orderRepository = require('../repositories/orderRepository');
const specialistRepository = require('../repositories/specialistRepository');

const ORDER_TYPES = ['standard', 'urgent', 'premium', 'warranty'];

// Deadline window in hours from creation, by order type — a modeling choice
// for the synthetic generator (not a claim about any real business), tuned
// so urgent/premium orders stress the planner while standard/warranty don't.
const DEADLINE_WINDOW_HOURS = {
  urgent: [2, 6],
  premium: [6, 24],
  standard: [24, 72],
  warranty: [48, 120],
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateSyntheticOrders(n, options = {}) {
  const referenceTime = options.referenceTime ? new Date(options.referenceTime) : new Date();
  const specialistTypes =
    options.specialistTypes ||
    [...new Set(specialistRepository.list().map(s => s.specialist_type))];

  if (specialistTypes.length === 0) {
    throw new Error('No specialists found — run db/seed.js before generating orders.');
  }

  const orders = [];
  for (let i = 0; i < n; i++) {
    const orderType = pick(ORDER_TYPES);
    const [minHours, maxHours] = DEADLINE_WINDOW_HOURS[orderType];
    const deadlineAt = new Date(referenceTime.getTime() + randomBetween(minHours, maxHours) * 3600 * 1000);

    const order = orderRepository.create({
      id: randomUUID(),
      orderType,
      requiredSpecialistType: pick(specialistTypes),
      estimatedHours: Math.round(randomBetween(1, 4) * 2) / 2,
      requiresEquipment: Math.random() < 0.3,
      createdAt: referenceTime.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
    });
    orders.push(order);
  }
  return orders;
}

module.exports = { generateSyntheticOrders, ORDER_TYPES, DEADLINE_WINDOW_HOURS };
