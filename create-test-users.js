const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Load .env.local if exists
if (fs.existsSync(path.join(__dirname, '.env.local'))) {
  require('dotenv').config({ path: '.env.local' });
  console.log('📝 Loaded .env.local');
} else {
  require('dotenv').config();
  console.log('📝 Loaded .env');
}

const { User } = require('./db/models');

async function createTestUsers() {
  try {
    console.log('🔄 Creating test users...\n');

    // Check if users already exist
    const existingGraduate = await User.findOne({ where: { email: 'candidate@mail.ru' } });
    const existingEmployer = await User.findOne({ where: { email: 'employer@mail.ru' } });

    if (existingGraduate && existingEmployer) {
      console.log('ℹ️  Test users already exist!\n');
      console.log('Login credentials:');
      console.log('👨‍🎓 Graduate: candidate@mail.ru / password123');
      console.log('🏢 Employer: employer@mail.ru / password123\n');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create graduate user
    if (!existingGraduate) {
      const graduate = await User.create({
        username: 'Иван Петров',
        email: 'candidate@mail.ru',
        password: hashedPassword,
        role: 'graduate'
      });
      console.log('✅ Created graduate user:', graduate.email);
    }

    // Create employer user
    if (!existingEmployer) {
      const employer = await User.create({
        username: 'ООО Технологии',
        email: 'employer@mail.ru',
        password: hashedPassword,
        role: 'employer'
      });
      console.log('✅ Created employer user:', employer.email);
    }

    console.log('\n🎉 Test users created successfully!\n');
    console.log('Login credentials:');
    console.log('👨‍🎓 Graduate: candidate@mail.ru / password123');
    console.log('🏢 Employer: employer@mail.ru / password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    process.exit(1);
  }
}

createTestUsers();