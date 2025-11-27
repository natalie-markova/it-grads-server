#!/bin/bash
set -e

DB_SERVER="185.55.56.52"

echo "🔧 Setting up remote database access for DBeaver..."

# Get your current IP
echo "📍 Detecting your IP address..."
MY_IP=$(curl -s ifconfig.me)
echo "Your IP: $MY_IP"

# Configure PostgreSQL
ssh root@${DB_SERVER} << EOF
    echo "Updating pg_hba.conf for remote access..."

    # Backup
    cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

    # Add rule for your IP
    echo "host    it-connect      itgrads         ${MY_IP}/32            md5" >> /etc/postgresql/*/main/pg_hba.conf
    echo "host    it-connect      postgres        ${MY_IP}/32            md5" >> /etc/postgresql/*/main/pg_hba.conf

    # Reload PostgreSQL
    systemctl reload postgresql

    echo "✅ PostgreSQL configured for remote access"
    echo ""
    echo "Connection details for DBeaver:"
    echo "  Host: ${DB_SERVER}"
    echo "  Port: 5432"
    echo "  Database: it-connect"
    echo "  Username: itgrads"
    echo "  Password: [ask admin]"
EOF

echo ""
echo "✅ Remote access configured!"
echo ""
echo "DBeaver Connection Settings:"
echo "  Host: ${DB_SERVER}"
echo "  Port: 5432"
echo "  Database: it-connect"
echo "  Username: itgrads"
echo "  SSL: Disable"
