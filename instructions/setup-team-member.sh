#!/bin/bash
set -e

echo "🚀 Setting up IT-Grads development environment..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
cd client/it-grads-client
npm install
cd ../../server/it-grads-server
npm install
cd ../..

# 2. Setup git hooks
echo "🔧 Setting up git hooks..."
chmod +x .git/hooks/post-merge

# 3. Sync database
echo "📊 Syncing database schema..."
cd server/it-grads-server
npm run db:sync
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure DBeaver connection:"
echo "   - Host: 185.55.56.52"
echo "   - Port: 5432"
echo "   - Database: postgres"
echo "   - Username: postgres"
echo "   - Password: (leave empty)"
echo ""
echo "2. Start development:"
echo "   cd client/it-grads-client && npm run dev"
echo "   cd server/it-grads-server && npm run dev"
echo ""
