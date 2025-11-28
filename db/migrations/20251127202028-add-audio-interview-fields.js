'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const sessionsTable = await queryInterface.describeTable('AIInterviewSessions');
    const messagesTable = await queryInterface.describeTable('AIInterviewMessages');

    // Add fields to AIInterviewSessions only if they don't exist
    if (!sessionsTable.interviewerPersona) {
      await queryInterface.addColumn('AIInterviewSessions', 'interviewerPersona', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'strict_hr, friendly_tech, direct_ceo'
      });
    }

    if (!sessionsTable.position) {
      await queryInterface.addColumn('AIInterviewSessions', 'position', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    if (!sessionsTable.overallScore) {
      await queryInterface.addColumn('AIInterviewSessions', 'overallScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score from 0-100'
      });
    }

    if (!sessionsTable.feedback) {
      await queryInterface.addColumn('AIInterviewSessions', 'feedback', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Final interviewer feedback'
      });
    }

    if (!sessionsTable.strengths) {
      await queryInterface.addColumn('AIInterviewSessions', 'strengths', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!sessionsTable.weaknesses) {
      await queryInterface.addColumn('AIInterviewSessions', 'weaknesses', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      });
    }

    if (!sessionsTable.duration) {
      await queryInterface.addColumn('AIInterviewSessions', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration in seconds'
      });
    }

    if (!sessionsTable.completedAt) {
      await queryInterface.addColumn('AIInterviewSessions', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    // Add fields to AIInterviewMessages only if they don't exist
    if (!messagesTable.score) {
      await queryInterface.addColumn('AIInterviewMessages', 'score', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for user answer (0-10)'
      });
    }

    if (!messagesTable.evaluation) {
      await queryInterface.addColumn('AIInterviewMessages', 'evaluation', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'AI evaluation of the answer'
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('AIInterviewSessions', 'interviewerPersona');
    await queryInterface.removeColumn('AIInterviewSessions', 'position');
    await queryInterface.removeColumn('AIInterviewSessions', 'overallScore');
    await queryInterface.removeColumn('AIInterviewSessions', 'feedback');
    await queryInterface.removeColumn('AIInterviewSessions', 'strengths');
    await queryInterface.removeColumn('AIInterviewSessions', 'weaknesses');
    await queryInterface.removeColumn('AIInterviewSessions', 'duration');
    await queryInterface.removeColumn('AIInterviewSessions', 'completedAt');
    await queryInterface.removeColumn('AIInterviewMessages', 'score');
    await queryInterface.removeColumn('AIInterviewMessages', 'evaluation');
  }
};
