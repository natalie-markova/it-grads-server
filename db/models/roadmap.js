'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Roadmap extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  Roadmap.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.ENUM('role', 'language', 'framework', 'skill'),
      allowNull: false,
      defaultValue: 'role'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#3B82F6'
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      allowNull: false,
      defaultValue: 'intermediate'
    },
    estimatedMonths: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    prerequisites: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    learningPath: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    resources: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    relatedRoadmaps: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    popularityScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Roadmap',
    tableName: 'Roadmaps'
  });

  return Roadmap;
};
