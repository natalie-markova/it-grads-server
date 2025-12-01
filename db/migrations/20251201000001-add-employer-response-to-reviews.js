'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Reviews', 'employerResponse', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('Reviews', 'employerResponseCreatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Reviews', 'employerResponse');
    await queryInterface.removeColumn('Reviews', 'employerResponseCreatedAt');
  }
};


