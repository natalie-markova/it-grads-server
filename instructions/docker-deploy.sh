#!/bin/bash
set -e

source .deployment-vars

echo "🚀 Deploying IT-Grads with Docker to itgrads.ru..."

# Build locally
echo "📦 Building Docker images..."
docker-compose build

# Save images
echo "💾 Saving Docker images..."
docker save itgrads-backend:latest | gzip > backend.tar.gz
docker save itgrads-frontend:latest | gzip > frontend.tar.gz

# Copy to server
echo "📤 Uploading to server..."
rsync -avz --progress docker-compose.yml .env.docker config/ \
    "${SERVER_USER}@${APP_SERVER_IP}:/var/www/it-grads/"

scp backend.tar.gz frontend.tar.gz \
    "${SERVER_USER}@${APP_SERVER_IP}:/var/www/it-grads/"

# Deploy on server
echo "🔧 Deploying on server..."
ssh "${SERVER_USER}@${APP_SERVER_IP}" << 'EOF'
    cd /var/www/it-grads

    # Install Docker if needed
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi

    # Install Docker Compose if needed
    if ! command -v docker-compose &> /dev/null; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Load images
    echo "📥 Loading Docker images..."
    docker load < backend.tar.gz
    docker load < frontend.tar.gz
    rm backend.tar.gz frontend.tar.gz

    # Setup SSL
    if [ ! -f /etc/letsencrypt/live/itgrads.ru/fullchain.pem ]; then
        apt-get update
        apt-get install -y certbot
        certbot certonly --standalone -d itgrads.ru -d www.itgrads.ru \
            --non-interactive --agree-tos --email admin@itgrads.ru
    fi

    # Stop old containers
    docker-compose down || true

    # Start containers
    docker-compose up -d

    # Show status
    docker-compose ps
    docker-compose logs --tail=20
EOF

rm backend.tar.gz frontend.tar.gz

echo "✅ Deployment complete!"
echo "🌐 Site: https://itgrads.ru"
