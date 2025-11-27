#!/bin/bash
set -e

source .deployment-vars

echo "🚀 Deploying IT-Grads with Docker to itgrads.ru..."

# Create archive and copy to server
echo "📤 Uploading files to server..."
tar --exclude='node_modules' --exclude='.git' --exclude='dist' \
    -czf /tmp/itgrads-deploy.tar.gz \
    docker-compose.yml .env.docker config/ server/ client/

scp /tmp/itgrads-deploy.tar.gz "${SERVER_USER}@${APP_SERVER_IP}:/tmp/"
rm /tmp/itgrads-deploy.tar.gz

ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOFEXTRACT'
    mkdir -p /var/www/it-grads
    cd /var/www/it-grads
    tar -xzf /tmp/itgrads-deploy.tar.gz
    rm /tmp/itgrads-deploy.tar.gz
EOFEXTRACT

# Deploy on server
echo "🔧 Building and deploying on server..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOFMAIN'
    cd /var/www/it-grads

    # Install Docker
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Setup SSL certificates
    if [ ! -f /etc/letsencrypt/live/itgrads.ru/fullchain.pem ]; then
        echo "Setting up SSL certificates..."
        apt-get update
        apt-get install -y certbot

        # Stop any service using port 80
        systemctl stop nginx 2>/dev/null || true
        docker-compose down 2>/dev/null || true

        certbot certonly --standalone \
            -d itgrads.ru -d www.itgrads.ru \
            --non-interactive --agree-tos \
            --email admin@itgrads.ru
    fi

    # Build and start containers
    echo "🏗️ Building Docker images..."
    docker-compose build

    echo "🚀 Starting containers..."
    docker-compose down || true
    docker-compose up -d

    # Wait for services
    sleep 5

    # Sync database
    echo "🔄 Syncing database..."
    docker-compose exec -T backend npm run db:sync

    echo ""
    echo "📊 Container status:"
    docker-compose ps

    echo ""
    echo "📋 Recent logs:"
    docker-compose logs --tail=30
EOFMAIN

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: https://itgrads.ru"
echo ""
echo "Check status: ssh root@${APP_SERVER_IP} 'cd /var/www/it-grads && docker-compose ps'"
echo "View logs: ssh root@${APP_SERVER_IP} 'cd /var/www/it-grads && docker-compose logs -f'"
