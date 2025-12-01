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
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT
    },
    skills: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    skillsArray: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    experience: {
      type: DataTypes.TEXT
    },
    education: {
      type: DataTypes.TEXT
    },
    portfolio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    desiredSalary: {
      type: DataTypes.INTEGER
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    level: {
      type: DataTypes.ENUM('junior', 'middle', 'senior', 'lead'),
      allowNull: true,
      defaultValue: 'junior'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    radarImage: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Resume',
    tableName: 'Resumes'
  });

  return Resume;
};