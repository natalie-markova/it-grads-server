'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Users');

    if (!tableInfo.photo) {
      await queryInterface.addColumn('Users', 'photo', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.lastName) {
      await queryInterface.addColumn('Users', 'lastName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.firstName) {
      await queryInterface.addColumn('Users', 'firstName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.middleName) {
      await queryInterface.addColumn('Users', 'middleName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.birthDate) {
      await queryInterface.addColumn('Users', 'birthDate', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.city) {
      await queryInterface.addColumn('Users', 'city', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.education) {
      await queryInterface.addColumn('Users', 'education', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.experience) {
      await queryInterface.addColumn('Users', 'experience', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.about) {
      await queryInterface.addColumn('Users', 'about', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.github) {
      await queryInterface.addColumn('Users', 'github', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.linkedin) {
      await queryInterface.addColumn('Users', 'linkedin', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.portfolio) {
      await queryInterface.addColumn('Users', 'portfolio', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.skills) {
      await queryInterface.addColumn('Users', 'skills', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!tableInfo.projects) {
      await queryInterface.addColumn('Users', 'projects', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'photo');
    await queryInterface.removeColumn('Users', 'lastName');
    await queryInterface.removeColumn('Users', 'firstName');
    await queryInterface.removeColumn('Users', 'middleName');
    await queryInterface.removeColumn('Users', 'birthDate');
    await queryInterface.removeColumn('Users', 'city');
    await queryInterface.removeColumn('Users', 'education');
    await queryInterface.removeColumn('Users', 'experience');
    await queryInterface.removeColumn('Users', 'about');
    await queryInterface.removeColumn('Users', 'github');
    await queryInterface.removeColumn('Users', 'linkedin');
    await queryInterface.removeColumn('Users', 'portfolio');
    await queryInterface.removeColumn('Users', 'skills');
    await queryInterface.removeColumn('Users', 'projects');
  }
};