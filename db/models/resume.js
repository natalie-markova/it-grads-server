'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Resume extends Model {
    static associate(models) {
      Resume.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      Resume.hasMany(models.Interview, {
        foreignKey: 'resumeId',
        as: 'interviews'
      });
    }
  }

  Resume.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    skills: {
      type: DataTypes.TEXT
    },
    experience: {
      type: DataTypes.TEXT
    },
    education: {
      type: DataTypes.TEXT
    },
    desiredSalary: {
      type: DataTypes.INTEGER
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Resume',
    tableName: 'Resumes'
  });

  return Resume;
};