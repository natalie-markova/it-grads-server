'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Graduates extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Graduates.hasMany(models.Conversations, { foreignKey: 'graduateId', as: 'conversations' });
    }
  }
  Graduates.init({
    username: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    password: DataTypes.STRING,
    role: {
      type: DataTypes.STRING,
      defaultValue: 'graduate'
    }
  }, {
    sequelize,
    modelName: 'Graduates',
  });
  return Graduates;
};

