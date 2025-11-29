# Database Structure

## 📂 Folders

### `migrations/`
Database schema - table creation, column additions, etc.

**Commands:**
```bash
npm run db:migrate        # Apply all new migrations
npm run db:migrate:undo   # Rollback last migration
npm run db:sync           # Sync all models (alternative)
```

### `seeders/`
Sample test data - example vacancies, resumes, roadmaps.

**Commands:**
```bash
npm run db:seed           # Load all test data
npm run db:seed:undo      # Remove all test data
```

### `models/`
Sequelize models - JavaScript representations of database tables.

### `config/`
Database configuration for different environments.

## 🚀 Quick Commands

```bash
# Full database reset
npm run db:reset          # Undo migrations → Migrate → Seed

# Development workflow
npm run db:sync           # Sync models to database
node create-test-users.js # Create test users
npm run db:seed           # Load sample data
```