const { Client } = require('pg');

async function recreateDatabase() {
  // Подключаемся к PostgreSQL (к базе postgres, не к it-connect)
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Отключаем всех пользователей от базы it-connect
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'it-connect'
        AND pid <> pg_backend_pid();
    `);
    console.log('✓ Terminated all connections to it-connect');

    // Удаляем базу данных
    await client.query('DROP DATABASE IF EXISTS "it-connect";');
    console.log('✓ Dropped database it-connect');

    // Создаем новую базу данных
    await client.query('CREATE DATABASE "it-connect";');
    console.log('✓ Created database it-connect');

    await client.end();
    console.log('\n✅ Database recreated successfully!');
    console.log('Now run: npx sequelize-cli db:migrate');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recreateDatabase();
