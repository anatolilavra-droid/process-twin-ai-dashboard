const specialistRepository = require('../repositories/specialistRepository');
const { serializeSpecialist } = require('../services/serializers');

function listSpecialists(req, res, next) {
  try {
    const specialists = specialistRepository.list();
    res.status(200).json(specialists.map(serializeSpecialist));
  } catch (err) {
    next(err);
  }
}

module.exports = { listSpecialists };
