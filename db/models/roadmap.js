'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Roadmap extends Model {
    static associate(models) {
      // Define associations here if needed
    }

    // Get localized data based on language
    getLocalized(lang = 'ru') {
      const isEn = lang === 'en';
      return {
        id: this.id,
        title: isEn && this.titleEn ? this.titleEn : this.title,
        slug: this.slug,
        category: this.category,
        description: isEn && this.descriptionEn ? this.descriptionEn : this.description,
        icon: this.icon,
        color: this.color,
        difficulty: this.difficulty,
        estimatedMonths: this.estimatedMonths,
        prerequisites: isEn && this.prerequisitesEn ? this.prerequisitesEn : this.prerequisites,
        learningPath: isEn && this.learningPathEn ? this.learningPathEn : this.learningPath,
        resources: isEn && this.resourcesEn ? this.resourcesEn : this.resources,
        relatedRoadmaps: isEn && this.relatedRoadmapsEn ? this.relatedRoadmapsEn : this.relatedRoadmaps,
        popularityScore: this.popularityScore,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
      };
    }
  }

  Roadmap.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    titleEn: {
      type: DataTypes.STRING,
      allowNull: true
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
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true
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
    prerequisitesEn: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    learningPath: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    },
    learningPathEn: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    resources: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    resourcesEn: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    relatedRoadmaps: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    relatedRoadmapsEn: {
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
