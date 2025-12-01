'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Resumes');

    if (!tableInfo.skillsArray) {
      await queryInterface.addColumn('Resumes', 'skillsArray', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!tableInfo.portfolio) {
      await queryInterface.addColumn('Resumes', 'portfolio', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    if (!tableInfo.level) {
      // Create ENUM type first
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Resumes_level" AS ENUM ('junior', 'middle', 'senior', 'lead');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.addColumn('Resumes', 'level', {
        type: Sequelize.ENUM('junior', 'middle', 'senior', 'lead'),
        allowNull: true,
        defaultValue: 'junior'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Resumes');

    if (tableInfo.level) {
      await queryInterface.removeColumn('Resumes', 'level');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Resumes_level";');
    }
    if (tableInfo.portfolio) {
      await queryInterface.removeColumn('Resumes', 'portfolio');
    }
    if (tableInfo.skillsArray) {
      await queryInterface.removeColumn('Resumes', 'skillsArray');
    }
  }
};