# Deployment Guide — NAC Manager

Last updated: 2026-06-21 | Target: Ubuntu 24.04 LTS + Docker Compose

---

## Prerequisites

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version          # >= 25.x
docker compose version    # >= 2.x
```

---

## First-Time Deployment

### 1. Clone the repository

```bash
git clone https://github.com/your-org/nac-manager.git
cd nac-manager
```

### 2. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set **all** required values:

```bash
DB_PASS=<strong_random_password>
SESSION_SECRET=$(openssl rand -hex 64)
RADIUS_SECRET=<your_network_radius_shared_secret>
RADIUS_TEST_SECRET=$(openssl rand -hex 16)
CREDENTIAL_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 3. Apply database indexes migration

```bash
# Run after initial schema push
bash scripts/startup/run-migrations.sh
```

### 4. Build and start all services

```bash
docker compose up -d --build
```

### 5. Run startup validation

```bash
bash scripts/startup/validate.sh
```

All checks must return PASS before the platform is operational.

---

## Service Architecture

```
Ubuntu Host
│
├── :80  ──→  nginx (nac-nginx)
│              ├── /api/*  ──→  api:8080 (nac-api)
│              └── /*      ──→  frontend (nac-frontend static)
│
├── :5432 ──→  postgres (nac-postgres)        [internal + optional external]
├── :1812 ──→  freeradius (nac-freeradius)   [RADIUS auth UDP]
├── :1813 ──→  freeradius (nac-freeradius)   [RADIUS accounting UDP]
└── :3799 ──→  freeradius (nac-freeradius)   [RADIUS CoA UDP]
```

---

## Service Management

```bash
# Start all services
docker compose up -d

# Stop all services (data preserved)
docker compose down

# Restart a single service
docker compose restart api

# View logs
docker compose logs -f api
docker compose logs -f freeradius
docker compose logs -f postgres

# Check health of all services
docker compose ps

# Force rebuild after code changes
docker compose up -d --build api
docker compose up -d --build frontend
```

---

## Upgrading

```bash
# Pull latest code
git pull origin main

# Apply any new DB migrations
bash scripts/startup/run-migrations.sh

# Rebuild and redeploy
docker compose up -d --build

# Validate
bash scripts/startup/validate.sh
```

---

## Cisco Switch Configuration

After deployment, configure your Cisco 2960X switches for MAB:

```
aaa new-model
aaa authentication dot1x default group radius
aaa authorization network default group radius
aaa accounting dot1x default start-stop group radius

radius server NAC-MANAGER
 address ipv4 <UBUNTU_HOST_IP> auth-port 1812 acct-port 1813
 key <RADIUS_SECRET from .env>

dot1x system-auth-control

interface GigabitEthernet0/1
 switchport mode access
 authentication port-control auto
 mab
 dot1x pae authenticator
 spanning-tree portfast
```

---

## FreeRADIUS Verification

```bash
# Test that FreeRADIUS is responding
docker compose exec freeradius \
  radtest health-check testing123 127.0.0.1 1812 ${RADIUS_TEST_SECRET}

# Test MAC authentication for an approved device
docker compose exec freeradius \
  radtest aa:bb:cc:dd:ee:ff aa:bb:cc:dd:ee:ff 127.0.0.1 1812 ${RADIUS_SECRET}
```

---

## Backup

```bash
# Database backup
docker compose exec postgres pg_dump \
  -U ${DB_USER} ${DB_NAME} | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# FreeRADIUS logs backup
docker compose exec freeradius \
  tar czf - /var/log/freeradius > freeradius-logs-$(date +%Y%m%d).tar.gz
```

---

## Rollback

```bash
# Stop services
docker compose down

# Restore database from backup
zcat backup-YYYYMMDD-HHMMSS.sql.gz | docker compose exec -T postgres \
  psql -U ${DB_USER} ${DB_NAME}

# Rollback schema migration (example: undo migration 002)
docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME} \
  -f /migrations/002_fk_constraints_rollback.sql

# Restart with previous image
docker compose up -d
```

---

## Network Requirements

| Port | Protocol | Direction | Purpose |
|---|---|---|---|
| 80 | TCP | Inbound | Web UI + API |
| 443 | TCP | Inbound | HTTPS (configure TLS separately) |
| 1812 | UDP | Inbound from switches | RADIUS Authentication |
| 1813 | UDP | Inbound from switches | RADIUS Accounting |
| 3799 | UDP | Outbound to switches | RADIUS Change of Authorization |
| 161 | UDP | Outbound to switches | SNMP polling |
| 389/636 | TCP | Outbound to AD | LDAP/LDAPS |
| 135/5985 | TCP | Outbound to DHCP/DNS | WinRM |
| 22 | TCP | Outbound to DHCP | SSH (ISC DHCP) |

---

## Troubleshooting

```bash
# API not healthy
docker compose logs api --tail=50

# FreeRADIUS not starting (often config syntax error)
docker compose logs freeradius --tail=100

# Database connection refused
docker compose logs postgres --tail=50
docker compose exec postgres pg_isready -U ${DB_USER}

# Check all container health
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"
```
