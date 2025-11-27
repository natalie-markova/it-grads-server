#!/bin/bash

###############################################################################
# IT-Grads Quick Update Script
# Быстрое обновление кода без полной переустановки
###############################################################################

set -e

# Load deployment variables
source .deployment-vars

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           IT-Grads Quick Update Deployment                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Build frontend
print_info "Building frontend..."
cd "${LOCAL_FRONTEND_PATH}"
npm run build
print_status "Frontend built"

# Prepare backend
print_info "Preparing backend..."
cd "../../${LOCAL_BACKEND_PATH}"
print_status "Backend ready"

# Deploy Backend
print_info "Deploying backend..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env*' \
    --exclude '*.log' \
    "../../${LOCAL_BACKEND_PATH}/" \
    "${SERVER_USER}@${APP_SERVER_IP}:${SERVER_BACKEND_PATH}/"
print_status "Backend deployed"

# Deploy Frontend
print_info "Deploying frontend..."
rsync -avz --delete \
    "../../${LOCAL_FRONTEND_PATH}/dist/" \
    "${SERVER_USER}@${APP_SERVER_IP}:${SERVER_FRONTEND_PATH}/"
print_status "Frontend deployed"

# Install dependencies and restart
print_info "Installing dependencies and restarting..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << EOF
    cd ${SERVER_BACKEND_PATH}
    npm install --production

    # Sync database schema
    NODE_ENV=production npm run db:sync

    # Restart PM2
    pm2 restart ${PM2_APP_NAME}

    echo ""
    echo "Status:"
    pm2 status
    echo ""
    echo "Recent logs:"
    pm2 logs ${PM2_APP_NAME} --lines 10 --nostream
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Update Completed Successfully!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_status "Site: https://itgrads.ru"
echo ""
