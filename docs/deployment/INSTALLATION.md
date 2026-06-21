# Installation Guide — NAC Manager

Last updated: 2026-06-21

---

## System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 100 GB (for logs + RADIUS accounting) |
| Docker | 25.x | Latest stable |
| Docker Compose | 2.x (plugin) | Latest stable |

---

## Network Requirements

- Static IP address on the management network
- Reachability to all Cisco switches (UDP 161 for SNMP, UDP 1812/1813 inbound from switches)
- Reachability to Active Directory (TCP 389/636)
- Reachability to DHCP servers (TCP 22 for ISC, TCP 5985 for Windows WinRM)

---

## Installation Steps

### Step 1 — Prepare the Ubuntu server

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install required tools
sudo apt-get install -y git curl netcat-openbsd postgresql-client openssl

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Step 2 — Deploy NAC Manager

```bash
git clone https://github.com/your-org/nac-manager.git /opt/nac-manager
cd /opt/nac-manager

cp .env.example .env
# Edit .env — set all passwords and secrets

docker compose up -d --build
```

### Step 3 — Initialize the database

```bash
# Push Drizzle schema (first time only)
docker compose exec api sh -c "cd /app && pnpm --filter @workspace/db run push"

# Apply performance migrations
bash scripts/startup/run-migrations.sh
```

### Step 4 — Create the first admin user

```bash
# Via the API (before auth middleware is enforced)
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@your-domain.local",
    "password": "YourStrongPassword123!",
    "role": "super_admin",
    "fullName": "System Administrator"
  }'
```

### Step 5 — Validate the deployment

```bash
bash scripts/startup/validate.sh
```

### Step 6 — Configure systemd service (auto-start on boot)

```bash
sudo tee /etc/systemd/system/nac-manager.service > /dev/null <<EOF
[Unit]
Description=NAC Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/nac-manager
ExecStart=docker compose up -d
ExecStop=docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable nac-manager
sudo systemctl start nac-manager
```

---

## Post-Installation Checklist

- [ ] All 5 services show as healthy: `docker compose ps`
- [ ] `bash scripts/startup/validate.sh` shows all PASS
- [ ] Admin user created and login works at http://server-ip
- [ ] At least one VLAN configured (including quarantine VLAN 999)
- [ ] At least one switch added with correct SNMP credentials
- [ ] FreeRADIUS client added matching each switch's IP
- [ ] Switch RADIUS config points to this server's IP
- [ ] Test MAB auth from a switch port: `show authentication sessions`
