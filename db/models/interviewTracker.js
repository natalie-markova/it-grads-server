'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InterviewTracker extends Model {
    static associate(models) {
      InterviewTracker.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  InterviewTracker.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('online', 'offline', 'phone'),
      allowNull: false,
      defaultValue: 'online'
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    meetingLink: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reminder: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    result: {
      type: DataTypes.ENUM('passed', 'failed', 'pending'),
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'InterviewTracker',
    tableName: 'InterviewTrackers'
  });

  return InterviewTracker;
};

