require('dotenv').config();

module.exports = {
development: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {
    ssl: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
},
test: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {
    ssl: false
  }
},
production: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {
    ssl: false,
    connectTimeout: 60000
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 60000,
    idle: 10000
  },
  logging: false
},
};