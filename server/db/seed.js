const { randomUUID } = require('crypto');
const specialistRepository = require('../repositories/specialistRepository');

// Neutral to the specific service business (workshop / IT service / cleaning) —
// only the specialist_type strings matter, per the domain note in CLAUDE.md.
const SPECIALISTS = [
  { name: 'Martin', specialistType: 'electrician', hoursPerDay: 8 },
  { name: 'Anna', specialistType: 'technician', hoursPerDay: 8 },
  { name: 'Jonas', specialistType: 'generalist', hoursPerDay: 6 },
];

const existing = specialistRepository.list();
if (existing.length > 0) {
  console.log(`Specialists already seeded (${existing.length}) — skipping.`);
} else {
  for (const specialist of SPECIALISTS) {
    specialistRepository.create({ id: randomUUID(), ...specialist });
  }
  console.log(`Seeded ${SPECIALISTS.length} specialists.`);
}
