
/**
 * Database Sync Script
 * Автоматически синхронизирует структуру базы данных при изменениях
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} else if (fs.existsSync(path.join(__dirname, '../.env.production'))) {
  require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
} else {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

const db = require('./models');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database synchronization...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? '***configured***' : 'NOT SET'}`);

    // Test connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Get all models
    const models = Object.keys(db).filter(key =>
      key !== 'sequelize' && key !== 'Sequelize'
    );
    console.log(`📦 Found ${models.length} models: ${models.join(', ')}`);

    // Sync all models
    // alter: true - will update tables without dropping data
    // force: false - will not drop tables
    await db.sequelize.sync({ alter: true });

    console.log('✅ Database synchronized successfully');
    console.log('📊 All model changes have been applied to the database');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database synchronization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run sync if this script is executed directly
if (require.main === module) {
  syncDatabase();
}

module.exports = syncDatabase;
