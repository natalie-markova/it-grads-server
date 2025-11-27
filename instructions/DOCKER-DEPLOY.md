# IT-Grads Docker Deployment - Ready

## ✅ Deployment Complete

Site: **https://itgrads.ru**

### Status
- Frontend: ✅ Running (Docker)
- Backend: ✅ Running (Docker + PostgreSQL on 185.55.56.52)
- Nginx: ✅ Running (HTTPS with Let's Encrypt)
- Database: ✅ Connected and synchronized

## Quick Commands

### Deploy/Update
```bash
./deploy-docker-remote.sh
```

### Check Status
```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose ps"
```

### View Logs
```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose logs -f"
```

### Restart Services
```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose restart"
```

### Sync Database (after model changes)
```bash
ssh root@185.55.56.201 "cd /var/www/it-grads && docker-compose exec backend npm run db:sync"
```

## DBeaver Connection (Remote Database)

Setup remote access:
```bash
./setup-db-remote.sh
```

**Connection Details:**
- Host: 185.55.56.52
- Port: 5432
- Database: it-connect
- Username: itgrads
- Password: (see .env.docker)
- SSL: Disable

## Architecture

```
Client → HTTPS (itgrads.ru)
           ↓
    Docker: Nginx (443)
           ├→ Frontend (container)
           └→ Backend (container:5001)
                  ↓
         PostgreSQL (185.55.56.52)
```

## Containers

- **itgrads-nginx** - Reverse proxy (ports 80, 443)
- **itgrads-frontend** - React app (Nginx)
- **itgrads-backend** - Node.js API
- **itgrads-certbot** - SSL renewal

## Files

- `docker-compose.yml` - Container orchestration
- `.env` - Environment variables (on server)
- `config/nginx/itgrads.docker.conf` - Nginx config

## Notes

- Database schema syncs automatically on deploy
- SSL certificates auto-renew every 90 days
- Containers restart automatically on server reboot
- Local DBeaver changes sync to remote DB instantly
