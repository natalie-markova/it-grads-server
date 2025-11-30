'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Application.belongsTo(models.Vacancy, {
        foreignKey: 'vacancyId',
        as: 'vacancy'
      });
    }
  }

  Application.init({
    vacancyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    },
    coverLetter: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Application',
    tableName: 'Applications'
  });

  return Application;
};