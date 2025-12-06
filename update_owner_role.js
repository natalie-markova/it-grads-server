require('dotenv').config({ path: '.env.development' });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

async function updateOwnerRole() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');
    
    // Обновляем записи, где работодатель предоставил доступ выпускнику
    const result1 = await sequelize.query(`
      UPDATE "InterviewTrackerAccesses"
      SET "ownerRole" = 'employer'
      WHERE "ownerRole" IS NULL
      AND "employerId" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "Users" u
        WHERE u.id = "InterviewTrackerAccesses"."employerId"
        AND u.role = 'employer'
      )
    `);
    
    console.log('Updated records with ownerRole = employer');
    
    // Обновляем записи, где выпускник предоставил доступ работодателю
    const result2 = await sequelize.query(`
      UPDATE "InterviewTrackerAccesses"
      SET "ownerRole" = 'graduate'
      WHERE "ownerRole" IS NULL
      AND EXISTS (
        SELECT 1 FROM "Users" u
        WHERE u.id = "InterviewTrackerAccesses"."graduateId"
        AND u.role = 'graduate'
      )
    `);
    
    console.log('Updated records with ownerRole = graduate');
    console.log('Update completed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating ownerRole:', error);
    await sequelize.close();
    process.exit(1);
  }
}

updateOwnerRole();
