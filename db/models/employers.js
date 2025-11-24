'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Employers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Employers.hasMany(models.Conversations, { foreignKey: 'employerId', as: 'conversations' });
    }
  }
  Employers.init({
    username: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    password: DataTypes.STRING,
    role: {
      type: DataTypes.STRING,
      defaultValue: 'employer'
    }
  }, {
    sequelize,
    modelName: 'Employers',
  });
  return Employers;
};

