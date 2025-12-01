'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('AIInterviewSessions');

    // Add interviewerPersona if not exists
    if (!tableInfo.interviewerPersona) {
      // First create the ENUM type if it doesn't exist
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_AIInterviewSessions_interviewerPersona" AS ENUM ('strict_hr', 'friendly_tech', 'direct_ceo');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await queryInterface.addColumn('AIInterviewSessions', 'interviewerPersona', {
        type: Sequelize.ENUM('strict_hr', 'friendly_tech', 'direct_ceo'),
        allowNull: true,
      });
    }

    if (!tableInfo.position) {
      await queryInterface.addColumn('AIInterviewSessions', 'position', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!tableInfo.overallScore) {
      await queryInterface.addColumn('AIInterviewSessions', 'overallScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.feedback) {
      await queryInterface.addColumn('AIInterviewSessions', 'feedback', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableInfo.duration) {
      await queryInterface.addColumn('AIInterviewSessions', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tableInfo.completedAt) {
      await queryInterface.addColumn('AIInterviewSessions', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Check AIInterviewMessages table
    const messageTableInfo = await queryInterface.describeTable('AIInterviewMessages');

    if (!messageTableInfo.score) {
      await queryInterface.addColumn('AIInterviewMessages', 'score', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!messageTableInfo.evaluation) {
      await queryInterface.addColumn('AIInterviewMessages', 'evaluation', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('AIInterviewSessions');
    const messageTableInfo = await queryInterface.describeTable('AIInterviewMessages');

    if (messageTableInfo.evaluation) {
      await queryInterface.removeColumn('AIInterviewMessages', 'evaluation');
    }
    if (messageTableInfo.score) {
      await queryInterface.removeColumn('AIInterviewMessages', 'score');
    }
    if (tableInfo.completedAt) {
      await queryInterface.removeColumn('AIInterviewSessions', 'completedAt');
    }
    if (tableInfo.duration) {
      await queryInterface.removeColumn('AIInterviewSessions', 'duration');
    }
    if (tableInfo.feedback) {
      await queryInterface.removeColumn('AIInterviewSessions', 'feedback');
    }
    if (tableInfo.overallScore) {
      await queryInterface.removeColumn('AIInterviewSessions', 'overallScore');
    }
    if (tableInfo.position) {
      await queryInterface.removeColumn('AIInterviewSessions', 'position');
    }
    if (tableInfo.interviewerPersona) {
      await queryInterface.removeColumn('AIInterviewSessions', 'interviewerPersona');
    }
  },
};