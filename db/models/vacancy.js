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

      Vacancy.hasMany(models.Application, {
        foreignKey: 'vacancyId',
        as: 'applications'
      });

      Vacancy.hasMany(models.Favorite, {
        foreignKey: 'vacancyId',
        as: 'favorites'
      });
    }
  }

  Vacancy.init({
    employerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
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
    level: {
      type: DataTypes.ENUM('junior', 'middle', 'senior', 'lead'),
      allowNull: true,
      defaultValue: 'middle'
    },
    skills: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    benefits: {
      type: DataTypes.TEXT,
      allowNull: true
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