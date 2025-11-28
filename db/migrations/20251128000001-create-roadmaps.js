'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Roadmaps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      category: {
        type: Sequelize.ENUM('role', 'language', 'framework', 'skill'),
        allowNull: false,
        defaultValue: 'role'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      icon: {
        type: Sequelize.STRING,
        allowNull: true
      },
      color: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '#3B82F6'
      },
      difficulty: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'intermediate'
      },
      estimatedMonths: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      prerequisites: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      learningPath: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      resources: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      relatedRoadmaps: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      popularityScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('Roadmaps', ['slug']);
    await queryInterface.addIndex('Roadmaps', ['category']);
    await queryInterface.addIndex('Roadmaps', ['difficulty']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Roadmaps');
  }
};
