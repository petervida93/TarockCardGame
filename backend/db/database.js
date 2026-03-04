const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connection established successfully');
  } catch (error) {
    console.warn('⚠ PostgreSQL not available (game will work in-memory mode)');
    // Nem dobunk errort, mert a játék működik in-memory is
  }
};

testConnection();

module.exports = sequelize;
