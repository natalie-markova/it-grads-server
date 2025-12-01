'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('RoadmapProgress')) {
      return;
    }

    await queryInterface.createTable('RoadmapProgress', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      roadmapId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Roadmaps',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      completedSteps: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Progress percentage 0-100'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastActivityAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Unique constraint - one progress record per user per roadmap
    await queryInterface.addConstraint('RoadmapProgress', {
      fields: ['userId', 'roadmapId'],
      type: 'unique',
      name: 'unique_user_roadmap_progress'
    });

    await queryInterface.addIndex('RoadmapProgress', ['userId']);
    await queryInterface.addIndex('RoadmapProgress', ['roadmapId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('RoadmapProgress');
  }
};