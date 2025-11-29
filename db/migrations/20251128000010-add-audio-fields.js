'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sessionTableInfo = await queryInterface.describeTable('AIInterviewSessions');
    const messageTableInfo = await queryInterface.describeTable('AIInterviewMessages');

    const promises = [];

    if (!sessionTableInfo.interviewerPersona) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'interviewerPersona', {
        type: Sequelize.ENUM('strict_hr', 'friendly_tech', 'direct_ceo'),
        allowNull: true,
      }));
    }
    if (!sessionTableInfo.position) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'position', {
        type: Sequelize.STRING,
        allowNull: true,
      }));
    }
    if (!sessionTableInfo.overallScore) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'overallScore', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }));
    }
    if (!sessionTableInfo.feedback) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'feedback', {
        type: Sequelize.TEXT,
        allowNull: true,
      }));
    }
    if (!sessionTableInfo.strengths) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'strengths', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      }));
    }
    if (!sessionTableInfo.weaknesses) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'weaknesses', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      }));
    }
    if (!sessionTableInfo.duration) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'duration', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }));
    }
    if (!sessionTableInfo.completedAt) {
      promises.push(queryInterface.addColumn('AIInterviewSessions', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }));
    }
    if (!messageTableInfo.score) {
      promises.push(queryInterface.addColumn('AIInterviewMessages', 'score', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }));
    }
    if (!messageTableInfo.evaluation) {
      promises.push(queryInterface.addColumn('AIInterviewMessages', 'evaluation', {
        type: Sequelize.TEXT,
        allowNull: true,
      }));
    }

    await Promise.all(promises);
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


