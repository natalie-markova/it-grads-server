'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vacancy extends Model {
    static associate(models) {
      Vacancy.belongsTo(models.User, {
        foreignKey: 'employerId',
        as: 'employer'
      });

      Vacancy.hasMany(models.Interview, {
        foreignKey: 'vacancyId',
        as: 'interviews'
      });
    }
  }

  Vacancy.init({
    employerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    requirements: {
      type: DataTypes.TEXT
    },
    salary: {
      type: DataTypes.INTEGER
    },
    location: {
      type: DataTypes.STRING
    },
    employmentType: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship'),
      defaultValue: 'full-time'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Vacancy',
    tableName: 'Vacancies'
  });

  return Vacancy;
};