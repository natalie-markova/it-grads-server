#!/bin/bash

###############################################################################
# IT-Grads Deployment Check Script
# Проверка статуса деплоя
###############################################################################

set -e

source .deployment-vars

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           IT-Grads Deployment Status Check                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check App Server connection
print_info "Checking App Server connection..."
if ssh -o ConnectTimeout=5 "${SERVER_USER}@${APP_SERVER_IP}" "echo 'OK'" > /dev/null 2>&1; then
    print_status "App Server (${APP_SERVER_IP}) - Connected"
else
    print_error "App Server (${APP_SERVER_IP}) - Connection failed"
fi

# Check DB Server connection
print_info "Checking DB Server connection..."
if ssh -o ConnectTimeout=5 "${SERVER_USER}@${DB_SERVER_IP}" "echo 'OK'" > /dev/null 2>&1; then
    print_status "DB Server (${DB_SERVER_IP}) - Connected"
else
    print_error "DB Server (${DB_SERVER_IP}) - Connection failed"
fi

echo ""
print_info "Checking PM2 status on App Server..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOF'
if command -v pm2 &> /dev/null; then
    pm2 status
else
    echo "PM2 not installed"
fi
EOF

echo ""
print_info "Checking Nginx status..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOF'
if systemctl is-active --quiet nginx; then
    echo "✓ Nginx is running"
    nginx -t 2>&1 | head -2
else
    echo "✗ Nginx is not running"
fi
EOF

echo ""
print_info "Checking SSL certificates..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOF'
if command -v certbot &> /dev/null; then
    certbot certificates 2>&1 | grep -A 5 "Certificate Name:" | head -6
else
    echo "Certbot not installed"
fi
EOF

echo ""
print_info "Checking HTTPS endpoints..."
echo "Frontend:"
curl -Ik https://itgrads.ru 2>&1 | head -15

echo ""
echo "Backend API:"
curl -Ik https://itgrads.ru/api 2>&1 | head -10

echo ""
print_info "Recent backend logs:"
ssh "${SERVER_USER}@${APP_SERVER_IP}" "pm2 logs ${PM2_APP_NAME} --lines 10 --nostream 2>&1 || echo 'Cannot get logs'"

echo ""
print_info "Disk usage on App Server:"
ssh "${SERVER_USER}@${APP_SERVER_IP}" "df -h | grep -E '(Filesystem|/$)'"

echo ""
print_info "Memory usage on App Server:"
ssh "${SERVER_USER}@${APP_SERVER_IP}" "free -h"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Check Complete                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
