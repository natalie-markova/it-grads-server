'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Vacancies');

    if (!tableInfo.companyName) {
      await queryInterface.addColumn('Vacancies', 'companyName', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!tableInfo.level) {
      // Create ENUM type first
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Vacancies_level" AS ENUM ('junior', 'middle', 'senior', 'lead');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.addColumn('Vacancies', 'level', {
        type: Sequelize.ENUM('junior', 'middle', 'senior', 'lead'),
        allowNull: true,
        defaultValue: 'middle'
      });
    }

    if (!tableInfo.skills) {
      await queryInterface.addColumn('Vacancies', 'skills', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!tableInfo.benefits) {
      await queryInterface.addColumn('Vacancies', 'benefits', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Vacancies');

    if (tableInfo.benefits) {
      await queryInterface.removeColumn('Vacancies', 'benefits');
    }
    if (tableInfo.skills) {
      await queryInterface.removeColumn('Vacancies', 'skills');
    }
    if (tableInfo.level) {
      await queryInterface.removeColumn('Vacancies', 'level');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Vacancies_level";');
    }
    if (tableInfo.companyName) {
      await queryInterface.removeColumn('Vacancies', 'companyName');
    }
  }
};