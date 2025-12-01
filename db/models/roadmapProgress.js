'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoadmapProgress extends Model {
    static associate(models) {
      RoadmapProgress.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });

      RoadmapProgress.belongsTo(models.Roadmap, {
        foreignKey: 'roadmapId',
        as: 'roadmap'
      });
    }
  }

  RoadmapProgress.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    roadmapId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    completedSteps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RoadmapProgress',
    tableName: 'RoadmapProgress'
  });

  return RoadmapProgress;
};