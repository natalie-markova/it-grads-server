'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Interview extends Model {
    static associate(models) {
      Interview.belongsTo(models.Vacancy, {
        foreignKey: 'vacancyId',
        as: 'vacancy'
      });

      Interview.belongsTo(models.User, {
        foreignKey: 'candidateId',
        as: 'candidate'
      });

      Interview.belongsTo(models.Resume, {
        foreignKey: 'resumeId',
        as: 'resume'
      });
    }
  }

  Interview.init({
    vacancyId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    candidateId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    resumeId: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.ENUM('pending', 'scheduled', 'completed', 'cancelled', 'rejected', 'accepted'),
      defaultValue: 'pending'
    },
    scheduledAt: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    sequelize,
    modelName: 'Interview',
    tableName: 'Interviews'
  });

  return Interview;
};