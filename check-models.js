const db = require('./db/models');
console.log('Available models:', Object.keys(db).filter(k => k !== 'sequelize' && k !== 'Sequelize'));
