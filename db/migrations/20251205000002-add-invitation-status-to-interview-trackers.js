'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Создаём ENUM тип
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_InterviewTrackers_invitationStatus" AS ENUM ('none', 'pending', 'accepted', 'declined');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Добавляем поле invitationStatus
    await queryInterface.addColumn('InterviewTrackers', 'invitationStatus', {
      type: Sequelize.ENUM('none', 'pending', 'accepted', 'declined'),
      defaultValue: 'none',
      allowNull: false,
      comment: 'Статус приглашения: none - обычная запись, pending - ожидает ответа, accepted - принято, declined - отклонено',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('InterviewTrackers', 'invitationStatus');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_InterviewTrackers_invitationStatus";');
  },
};
