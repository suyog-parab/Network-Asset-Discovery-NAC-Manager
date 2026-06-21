# Database Inventory — NAC Manager v0.1

Generated: 2026-06-21 | Engine: PostgreSQL (Replit managed) | ORM: Drizzle ORM 0.45.x

---

## Connection

- Driver: `pg` (via drizzle-orm/node-postgres)
- Config: `DATABASE_URL` environment variable
- Schema push: `pnpm --filter @workspace/db run push`
- Force push: `pnpm --filter @workspace/db run push-force`

---

## Table Inventory

### 1. `sites`

```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
code        TEXT
address     TEXT
city        TEXT
country     TEXT
parent_id   INTEGER                          -- self-referential (no FK constraint)
type        TEXT NOT NULL DEFAULT 'site'     -- site|branch|building|floor|rack
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No FK constraint on `parent_id`. No index on `parent_id`. No check constraint on `type`.

---

### 2. `vlans`

```sql
id           SERIAL PRIMARY KEY
vlan_id      INTEGER NOT NULL UNIQUE
name         TEXT NOT NULL
description  TEXT
type         TEXT                            -- production|quarantine|guest|management
is_quarantine BOOLEAN NOT NULL DEFAULT false
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No index on `is_quarantine`. No check constraint on `type`.

---

### 3. `switches`

```sql
id               SERIAL PRIMARY KEY
name             TEXT NOT NULL
ip_address       TEXT NOT NULL
model            TEXT
location         TEXT
site_id          INTEGER                     -- no FK constraint
snmp_version     TEXT NOT NULL DEFAULT 'v2c'
snmp_community   TEXT
snmp_username    TEXT
snmp_auth_password TEXT                      -- stored in plaintext
snmp_priv_password TEXT                      -- stored in plaintext
status           TEXT NOT NULL DEFAULT 'unknown'
last_polled      TIMESTAMPTZ
created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Critical gaps:**
- SNMP credentials stored in plaintext — must be encrypted at rest
- No FK constraint on `site_id`
- No unique constraint on `ip_address`
- No index on `site_id`

---

### 4. `devices`

```sql
id               SERIAL PRIMARY KEY
mac_address      TEXT NOT NULL UNIQUE
ip_address       TEXT
hostname         TEXT
username         TEXT
vendor           TEXT
operating_system TEXT
department       TEXT
switch_name      TEXT                        -- denormalized, not FK to switches.name
switch_port      TEXT
vlan_id          INTEGER                     -- no FK constraint
site_id          INTEGER                     -- no FK constraint
status           TEXT NOT NULL DEFAULT 'DISCOVERED'
first_seen       TIMESTAMPTZ NOT NULL DEFAULT now()
last_seen        TIMESTAMPTZ NOT NULL DEFAULT now()
approved_at      TIMESTAMPTZ
approved_by      TEXT
notes            TEXT
radius_synced    BOOLEAN NOT NULL DEFAULT false
created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:**
- `switch_name` is denormalized text; should reference `switches.id`
- No FK constraints on `vlan_id`, `site_id`
- No index on `status`, `vlan_id`, `site_id`, `ip_address`
- No index on `last_seen` (critical for discovery polling)
- `radius_synced` flag is unreliable; actual RADIUS state not tracked

---

### 5. `device_history`

```sql
id           SERIAL PRIMARY KEY
device_id    INTEGER NOT NULL               -- no FK constraint
action       TEXT NOT NULL
old_status   TEXT
new_status   TEXT
old_vlan     TEXT
new_vlan     TEXT
performed_by TEXT
notes        TEXT
created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No FK constraint on `device_id`. No index on `device_id`.

---

### 6. `discovery_sources`

```sql
id              SERIAL PRIMARY KEY
name            TEXT NOT NULL
type            TEXT NOT NULL               -- snmp|dhcp_windows|dhcp_isc|dns_windows|dns_bind|active_directory
host            TEXT NOT NULL
port            INTEGER
username        TEXT
password        TEXT                        -- stored in plaintext
community       TEXT                        -- SNMP community (plaintext)
enabled         BOOLEAN NOT NULL DEFAULT true
last_run_at     TIMESTAMPTZ
last_run_status TEXT
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Critical gaps:**
- Credentials stored in plaintext (`password`, `community`)
- No check constraint on `type`
- No fields for: retry count, last error, latency, consecutive failures

---

### 7. `discovery_jobs`

```sql
id               SERIAL PRIMARY KEY
type             TEXT NOT NULL
status           TEXT NOT NULL DEFAULT 'pending'
source_id        INTEGER                    -- no FK constraint
source_name      TEXT                       -- denormalized
devices_found    INTEGER NOT NULL DEFAULT 0
devices_new      INTEGER NOT NULL DEFAULT 0
devices_updated  INTEGER NOT NULL DEFAULT 0
error_message    TEXT
started_at       TIMESTAMPTZ
completed_at     TIMESTAMPTZ
created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:**
- No `log` column for structured job logs
- No `triggered_by` (user ID)
- No FK on `source_id`
- `source_name` is denormalized

---

### 8. `radius_clients`

```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
ip_address  TEXT NOT NULL
secret      TEXT NOT NULL                   -- stored in plaintext
nas_type    TEXT
description TEXT
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Critical gap:** RADIUS shared secret stored in plaintext.

---

### 9. `radius_groups`

```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL UNIQUE
vlan_id     INTEGER                         -- no FK constraint
attribute   TEXT
value       TEXT
description TEXT
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No FK on `vlan_id`.

---

### 10. `nac_policies`

```sql
id          SERIAL PRIMARY KEY
name        TEXT NOT NULL
description TEXT
condition   TEXT NOT NULL
action      TEXT NOT NULL
priority    INTEGER NOT NULL DEFAULT 10
vlan_id     INTEGER                         -- no FK constraint
enabled     BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Critical gap:** Policies exist but no engine evaluates them against RADIUS requests.

---

### 11. `alerts`

```sql
id              SERIAL PRIMARY KEY
type            TEXT NOT NULL
severity        TEXT NOT NULL DEFAULT 'info'
status          TEXT NOT NULL DEFAULT 'open'
message         TEXT NOT NULL
device_id       INTEGER                     -- no FK constraint
acknowledged_by TEXT
resolved_at     TIMESTAMPTZ
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No index on `status`, `severity`. No FK on `device_id`.

---

### 12. `audit_logs`

```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER
username    TEXT
action      TEXT NOT NULL
entity_type TEXT
entity_id   INTEGER
old_value   TEXT
new_value   TEXT
ip_address  TEXT
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Gaps:** No index on `created_at`, `user_id`, `action`. Old/new values stored as TEXT (should be JSONB).

---

### 13. `users`

```sql
id            SERIAL PRIMARY KEY
username      TEXT NOT NULL UNIQUE
email         TEXT NOT NULL UNIQUE
password_hash TEXT NOT NULL               -- SHA-256, not bcrypt
role          TEXT NOT NULL DEFAULT 'read_only'
full_name     TEXT
active        BOOLEAN NOT NULL DEFAULT true
last_login_at TIMESTAMPTZ
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Critical gaps:**
- `password_hash` uses SHA-256 + static salt — must replace with bcrypt
- No session table
- No MFA fields
- No password reset tokens

---

## Missing Tables (Required for Full Implementation)

| Table | Purpose | Phase |
|---|---|---|
| `integration_logs` | Per-job structured log lines | Phase 2-5 |
| `connection_tests` | Test results per source | Phase 11 |
| `device_sessions` | RADIUS accounting sessions | Phase 8 |
| `radius_sync_log` | FreeRADIUS sync audit trail | Phase 7 |
| `coa_log` | Change of Authorization history | Phase 9 |
| `user_sessions` | Browser session storage | Phase 13 |

---

## Missing Indexes (Performance)

```sql
-- Required for production performance
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_vlan_id ON devices(vlan_id);
CREATE INDEX idx_devices_site_id ON devices(site_id);
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);
CREATE INDEX idx_devices_ip_address ON devices(ip_address);
CREATE INDEX idx_device_history_device_id ON device_history(device_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_discovery_jobs_status ON discovery_jobs(status);
```

---

## Missing FreeRADIUS SQL Tables

FreeRADIUS rlm_sql requires these tables in the **same or linked** PostgreSQL:

```sql
-- Standard FreeRADIUS SQL schema tables needed:
radcheck        -- Per-user check attributes (MAC → Auth-Type := Accept)
radreply        -- Per-user reply attributes (MAC → VLAN AVPs)
radgroupcheck   -- Per-group check attributes
radgroupreply   -- Per-group reply attributes (group → VLAN)
radusergroup    -- User-to-group membership
radacct         -- Accounting records (session start/stop)
radpostauth     -- Post-auth logging
nas             -- NAS client list (alternative to clients.conf)
```
