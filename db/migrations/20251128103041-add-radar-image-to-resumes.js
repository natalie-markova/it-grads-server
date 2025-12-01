'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Resumes');

    if (!tableInfo.radarImage) {
      await queryInterface.addColumn('Resumes', 'radarImage', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Resumes');
    if (tableInfo.radarImage) {
      await queryInterface.removeColumn('Resumes', 'radarImage');
    }
  }
};
