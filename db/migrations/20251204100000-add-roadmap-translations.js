'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add English translation fields to Roadmaps table
    await queryInterface.addColumn('Roadmaps', 'titleEn', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Roadmaps', 'descriptionEn', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Roadmaps', 'prerequisitesEn', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('Roadmaps', 'learningPathEn', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('Roadmaps', 'resourcesEn', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await queryInterface.addColumn('Roadmaps', 'relatedRoadmapsEn', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: []
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Roadmaps', 'titleEn');
    await queryInterface.removeColumn('Roadmaps', 'descriptionEn');
    await queryInterface.removeColumn('Roadmaps', 'prerequisitesEn');
    await queryInterface.removeColumn('Roadmaps', 'learningPathEn');
    await queryInterface.removeColumn('Roadmaps', 'resourcesEn');
    await queryInterface.removeColumn('Roadmaps', 'relatedRoadmapsEn');
  }
};
