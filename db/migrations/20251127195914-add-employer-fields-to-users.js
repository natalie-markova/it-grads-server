'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');

    if (!tableInfo.companyName) {
      await queryInterface.addColumn('Users', 'companyName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.companyDescription) {
      await queryInterface.addColumn('Users', 'companyDescription', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.companyWebsite) {
      await queryInterface.addColumn('Users', 'companyWebsite', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.companyAddress) {
      await queryInterface.addColumn('Users', 'companyAddress', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.companySize) {
      await queryInterface.addColumn('Users', 'companySize', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.industry) {
      await queryInterface.addColumn('Users', 'industry', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'companyName');
    await queryInterface.removeColumn('Users', 'companyDescription');
    await queryInterface.removeColumn('Users', 'companyWebsite');
    await queryInterface.removeColumn('Users', 'companyAddress');
    await queryInterface.removeColumn('Users', 'companySize');
    await queryInterface.removeColumn('Users', 'industry');
  }
};
