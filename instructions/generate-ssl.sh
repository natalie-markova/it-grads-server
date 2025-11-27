#!/bin/bash

###############################################################################
# SSL Certificate Setup Script
# Настройка SSL сертификатов для itgrads.ru
###############################################################################

set -e

source .deployment-vars

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            SSL Certificate Setup for itgrads.ru           ║${NC}"
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

# Ask for email
print_info "Please enter an email address for Let's Encrypt notifications:"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
    EMAIL="admin@itgrads.ru"
    print_info "Using default email: $EMAIL"
fi

print_info "Setting up SSL certificates on ${APP_SERVER_IP}..."

ssh "${SERVER_USER}@${APP_SERVER_IP}" << EOF
    set -e

    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx

    echo "Creating directory for Let's Encrypt verification..."
    mkdir -p /var/www/certbot

    echo "Obtaining SSL certificate..."
    certbot --nginx \
        -d ${DOMAIN} \
        -d itgrads.ru \
        --non-interactive \
        --agree-tos \
        --email ${EMAIL} \
        --redirect

    echo "Setting up automatic renewal..."
    systemctl enable certbot.timer
    systemctl start certbot.timer

    echo "Testing certificate renewal..."
    certbot renew --dry-run

    echo "Restarting Nginx..."
    systemctl reload nginx

    echo ""
    echo "Certificate information:"
    certbot certificates
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         SSL Certificates Configured Successfully!         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_status "HTTPS enabled for itgrads.ru and www.itgrads.ru"
print_status "Auto-renewal configured"
echo ""
print_info "Test your site:"
echo "  curl -Ik https://itgrads.ru"
echo "  curl -Ik https://www.itgrads.ru"
echo ""
