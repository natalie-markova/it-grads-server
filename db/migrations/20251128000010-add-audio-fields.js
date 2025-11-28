'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.addColumn('AIInterviewSessions', 'interviewerPersona', {
        type: Sequelize.ENUM('strict_hr', 'friendly_tech', 'direct_ceo'),
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewSessions', 'position', {
        type: Sequelize.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewSessions', 'overallScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewSessions', 'feedback', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewSessions', 'strengths', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      }),
      queryInterface.addColumn('AIInterviewSessions', 'weaknesses', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      }),
      queryInterface.addColumn('AIInterviewSessions', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewSessions', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewMessages', 'score', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
      queryInterface.addColumn('AIInterviewMessages', 'evaluation', {
        type: Sequelize.TEXT,
        allowNull: true,
      }),
    ]);
  },

  async down(queryInterface, Sequelize) {
    await Promise.all([
      queryInterface.removeColumn('AIInterviewMessages', 'evaluation'),
      queryInterface.removeColumn('AIInterviewMessages', 'score'),
      queryInterface.removeColumn('AIInterviewSessions', 'completedAt'),
      queryInterface.removeColumn('AIInterviewSessions', 'duration'),
      queryInterface.removeColumn('AIInterviewSessions', 'weaknesses'),
      queryInterface.removeColumn('AIInterviewSessions', 'strengths'),
      queryInterface.removeColumn('AIInterviewSessions', 'feedback'),
      queryInterface.removeColumn('AIInterviewSessions', 'overallScore'),
      queryInterface.removeColumn('AIInterviewSessions', 'position'),
      queryInterface.removeColumn('AIInterviewSessions', 'interviewerPersona'),
    ]);

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AIInterviewSessions_interviewerPersona";');
  },
};


