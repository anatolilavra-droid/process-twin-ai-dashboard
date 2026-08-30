require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  dbPath: process.env.DB_PATH || './data/process-twin.sqlite',
};
