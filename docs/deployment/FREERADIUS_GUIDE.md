# FreeRADIUS Configuration Guide — NAC Manager

Last updated: 2026-06-21

---

## Overview

NAC Manager uses FreeRADIUS 3.2.x for MAC Authentication Bypass (MAB). FreeRADIUS is configured with `rlm_sql` backed by the same PostgreSQL database that drives the NAC Manager platform.

Device policy decisions flow:
```
Switch (MAB request) → FreeRADIUS (UDP 1812) → PostgreSQL radcheck table
                                              → NAC Manager /api/radius/authorize (future)
                                              → Access-Accept + VLAN AVPs → Switch
```

---

## Database Tables

### radcheck — Per-device authentication rules

Each approved device has one row:
```sql
username  = 'aa:bb:cc:dd:ee:ff'   -- MAC address, lowercase, colon-separated
attribute = 'Auth-Type'
op        = ':='
value     = 'Accept'
```

### radreply — Per-device VLAN assignment

Each approved device has three reply rows for VLAN assignment:
```sql
('aa:bb:cc:dd:ee:ff', 'Tunnel-Type',             '=', 'VLAN')
('aa:bb:cc:dd:ee:ff', 'Tunnel-Medium-Type',       '=', 'IEEE-802')
('aa:bb:cc:dd:ee:ff', 'Tunnel-Private-Group-ID',  '=', '10')   -- VLAN ID
```

### Quarantine device

Replace the VLAN ID with the quarantine VLAN:
```sql
UPDATE radreply
SET value = '999'
WHERE username = 'aa:bb:cc:dd:ee:ff'
  AND attribute = 'Tunnel-Private-Group-ID';
```

### Remove device (reject)

```sql
DELETE FROM radcheck WHERE username = 'aa:bb:cc:dd:ee:ff';
DELETE FROM radreply  WHERE username = 'aa:bb:cc:dd:ee:ff';
DELETE FROM radusergroup WHERE username = 'aa:bb:cc:dd:ee:ff';
```

---

## MAC Address Normalization

FreeRADIUS receives MACs from Cisco in the format `aabb.ccdd.eeff` (Cisco notation).

The `mac_auth` policy in `policy.d/mac_auth` normalizes this to `aa:bb:cc:dd:ee:ff` before the SQL lookup.

All MACs stored in `radcheck`/`radreply` must be lowercase colon-separated.

---

## NAS Clients

RADIUS clients (switches) can be defined in two ways:

**Option A — `clients.conf`** (static, rebuilt on deploy):
```
client cisco-2960x-floor1 {
    ipaddr = 192.168.1.10
    secret = your-radius-secret
    nas_type = cisco
    shortname = floor1-sw01
}
```

**Option B — `nas` table** (dynamic, managed by NAC Manager):
```sql
INSERT INTO nas (nasname, shortname, type, secret, description)
VALUES ('192.168.1.10', 'floor1-sw01', 'cisco', 'your-radius-secret', 'Floor 1 Switch');
```

NAC Manager writes to the `nas` table when you add a RADIUS client through the GUI.

---

## Testing

```bash
# Test that FreeRADIUS responds (any valid request)
docker compose exec freeradius \
  radtest testuser testpass 127.0.0.1 1812 ${RADIUS_TEST_SECRET}

# Test MAB for a specific approved device MAC
docker compose exec freeradius \
  radtest aa:bb:cc:dd:ee:ff aa:bb:cc:dd:ee:ff 127.0.0.1 1812 ${RADIUS_SECRET}
# Expected: Access-Accept with Tunnel-Private-Group-ID = <vlan>

# Test MAB for an unapproved device MAC
docker compose exec freeradius \
  radtest ff:ee:dd:cc:bb:aa ff:ee:dd:cc:bb:aa 127.0.0.1 1812 ${RADIUS_SECRET}
# Expected: Access-Reject
```

---

## Change of Authorization (CoA)

When a device is quarantined or approved in the NAC Manager UI, a CoA packet is sent to the switch to force immediate VLAN reassignment without disconnecting the device.

**CoA packet attributes:**
```
Calling-Station-Id = "AA:BB:CC:DD:EE:FF"
Tunnel-Type = VLAN
Tunnel-Medium-Type = IEEE-802
Tunnel-Private-Group-ID = 999   (quarantine) or production VLAN
Event-Timestamp = <now>
```

**CoA port:** UDP 3799 on the switch (NAS)

**Switch requirement:** `aaa server radius dynamic-author` must be configured:
```
aaa server radius dynamic-author
 client <NAC_MANAGER_IP> server-key <RADIUS_SECRET>
 port 3799
```

---

## Logs

```bash
# Real-time FreeRADIUS authentication log
docker compose exec freeradius tail -f /var/log/freeradius/radius.log

# RADIUS accounting records
docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME} \
  -c "SELECT callingstationid, nasipaddress, acctstarttime, acctstoptime FROM radacct ORDER BY acctstarttime DESC LIMIT 20"

# Post-auth log (all auth attempts)
docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME} \
  -c "SELECT username, reply, authdate FROM radpostauth ORDER BY authdate DESC LIMIT 20"
```
