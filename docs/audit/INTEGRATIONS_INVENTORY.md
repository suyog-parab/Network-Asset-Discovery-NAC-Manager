# Integrations Inventory — NAC Manager v0.1

Generated: 2026-06-21

---

## Summary

| Integration | Configured | Connection Test | Real Implementation | Phase to Fix |
|---|---|---|---|---|
| SNMP (v2c/v3) | ❌ | ❌ | ❌ | Phase 2 |
| DHCP (Windows) | ❌ | ❌ | ❌ | Phase 3 |
| DHCP (ISC) | ❌ | ❌ | ❌ | Phase 3 |
| DNS Reverse Lookup | ❌ | ❌ | ❌ | Phase 4 |
| DNS (Windows) | ❌ | ❌ | ❌ | Phase 4 |
| DNS (BIND) | ❌ | ❌ | ❌ | Phase 4 |
| Active Directory (LDAP) | ❌ | ❌ | ❌ | Phase 5 |
| Active Directory (LDAPS) | ❌ | ❌ | ❌ | Phase 5 |
| FreeRADIUS (container) | ❌ | ❌ | ❌ | Phase 1+7 |
| FreeRADIUS (rlm_sql) | ❌ | ❌ | ❌ | Phase 7 |
| RADIUS CoA (RFC 3576) | ❌ | ❌ | ❌ | Phase 9 |
| SNMP VLAN write (fallback) | ❌ | ❌ | ❌ | Phase 9 |
| PostgreSQL | ✅ | ✅ (implicit) | ✅ | — |

---

## 1. SNMP

**Current state:** Data model exists (`switches` table, `discovery_sources` with type `snmp`). No SNMP library installed. Discovery job triggers `Math.random()`.

**Required libraries:** `net-snmp` (Node.js SNMP library)

**Required OIDs for Cisco Catalyst 2960X:**

| OID | Table | Purpose |
|---|---|---|
| `1.3.6.1.2.1.3.1.1.2` | ipNetToMediaPhysAddress | ARP table: IP → MAC |
| `1.3.6.1.2.1.17.7.1.2.2.1.2` | dot1qTpFdbPort | MAC table: MAC → port index |
| `1.3.6.1.2.1.17.7.1.2.2.1.3` | dot1qTpFdbStatus | MAC table: entry status |
| `1.3.6.1.2.1.2.2.1.1` | ifIndex | Interface index |
| `1.3.6.1.2.1.2.2.1.2` | ifDescr | Interface description |
| `1.3.6.1.2.1.2.2.1.8` | ifOperStatus | Interface operational status |
| `1.3.6.1.2.1.17.7.1.4.2.1.3` | dot1qVlanStaticName | VLAN name |
| `1.3.6.1.4.1.9.9.23.1.2.1.1` | cdpCacheEntry | CDP neighbor table |
| `1.3.6.1.2.1.17.7.1.4.5.1.1` | dot1qPvid | Port VLAN assignment (for VLAN write) |

**SNMPv3 parameters needed:** `authProtocol` (SHA/MD5), `privProtocol` (AES/DES), `authKey`, `privKey`, `username`, `contextName`

---

## 2. DHCP Collector

**Current state:** Source type `dhcp_windows` and `dhcp_isc` exist in enum. Zero implementation.

**Windows DHCP collection approach:**
- WinRM connection to DHCP server
- PowerShell: `Get-DhcpServerv4Lease -ScopeId x.x.x.x | Select-Object IPAddress, ClientId, HostName, LeaseExpiryTime, AddressState`
- Requires: `winrm` Node.js library, Windows credentials stored encrypted

**ISC DHCP collection approach:**
- SSH to DHCP server
- Parse `/var/lib/dhcpd/dhcpd.leases` file format
- Requires: `ssh2` Node.js library, SSH key or password

**Lease fields to extract:** `ip_address`, `mac_address` (normalize to `XX:XX:XX:XX:XX:XX`), `hostname`, `lease_start`, `lease_end`, `state`

---

## 3. DNS Resolver

**Current state:** Zero implementation.

**Built-in Node.js DNS (for reverse lookups):**
- `dns.promises.reverse(ip)` — PTR record lookup
- `dns.promises.lookup(hostname)` — forward lookup
- No external library needed for basic resolution

**Windows DNS:**
- WinRM + PowerShell: `Get-DnsServerResourceRecord -ZoneName corp.local -RRType A`

**BIND DNS:**
- AXFR zone transfer via `dns2` library
- Or: `dig AXFR @server zone` subprocess

---

## 4. Active Directory / LDAP

**Current state:** Source type `active_directory` in enum. Zero implementation.

**Required library:** `ldapts` (modern async LDAP client for Node.js)

**Connection parameters:**
- URL: `ldap://server:389` or `ldaps://server:636`
- Bind DN: `cn=svc-nac,ou=service accounts,dc=corp,dc=local`
- Bind password (must be encrypted in DB)
- Base DN: `dc=corp,dc=local`

**Computer object attributes to retrieve:**
```
cn, dNSHostName, operatingSystem, operatingSystemVersion,
department, lastLogon, lastLogonTimestamp, distinguishedName,
memberOf, userAccountControl
```

**User-to-device correlation:**
- Query `(&(objectClass=computer)(cn=HOSTNAME))` to find computer account
- Query `(&(objectClass=user)(sAMAccountName=USERNAME))` for user details

**Incremental sync:** Use `uSNChanged > lastHighestUSN` filter

---

## 5. FreeRADIUS

**Current state:** `radius_clients` and `radius_groups` tables exist (NAC DB only). No FreeRADIUS container. The `POST /radius/sync` endpoint sets `radiusSynced=true` in the NAC database — it does not write to FreeRADIUS at all.

**FreeRADIUS version target:** 3.2.x (freeradius/freeradius-server:3.2 Docker image)

**Configuration files required:**
```
raddb/
├── clients.conf          -- NAS client definitions (auto-generated from radius_clients table)
├── radiusd.conf          -- Main config
├── mods-enabled/
│   ├── sql               -- rlm_sql pointing to PostgreSQL
│   └── always            -- fallback modules
├── mods-available/
│   └── sql               -- SQL module config with pgsql driver
├── sites-enabled/
│   ├── default           -- Virtual server (MAB + dot1x)
│   └── inner-tunnel      -- EAP inner tunnel (if needed)
└── policy.d/
    └── mac_auth          -- MAB MAC normalization policy
```

**rlm_sql configuration:**
```
sql {
  dialect = "postgresql"
  driver = "rlm_sql_postgresql"
  server = "postgres"
  port = 5432
  login = "${DB_USER}"
  password = "${DB_PASS}"
  radius_db = "${DB_NAME}"
  read_clients = yes
  client_table = "nas"
}
```

**RADIUS SQL tables (radcheck example for approved MAC):**
```sql
INSERT INTO radcheck (username, attribute, op, value)
VALUES ('aa:bb:cc:11:22:33', 'Auth-Type', ':=', 'Accept');

INSERT INTO radreply (username, attribute, op, value)
VALUES ('aa:bb:cc:11:22:33', 'Tunnel-Type', '=', 'VLAN'),
       ('aa:bb:cc:11:22:33', 'Tunnel-Medium-Type', '=', 'IEEE-802'),
       ('aa:bb:cc:11:22:33', 'Tunnel-Private-Group-ID', '=', '10');
```

---

## 6. RADIUS Change of Authorization (CoA) — RFC 3576

**Current state:** Zero implementation.

**Purpose:** Force a NAS (Cisco switch) to re-authenticate a connected device without physically disconnecting it. Used to move a device to a quarantine VLAN immediately after the quarantine action.

**Protocol:** UDP packet to NAS:3799 (CoA port)

**Implementation options:**
- Option A: `radclient` subprocess (`echo "Acct-Session-Id=..." | radclient nas:3799 coa secret`)
- Option B: Native UDP datagram (RFC 3576 packet construction)
- Recommendation: `radclient` subprocess initially, native UDP for production

**CoA packet attributes:**
```
Calling-Station-Id = "AA:BB:CC:11:22:33"   -- device MAC
NAS-IP-Address = switch_ip
Tunnel-Type = VLAN
Tunnel-Medium-Type = IEEE-802
Tunnel-Private-Group-ID = 999               -- quarantine VLAN
Event-Timestamp = now
```

---

## 7. SNMP VLAN Write (Quarantine Fallback)

**Current state:** Zero implementation.

**Purpose:** If CoA is unavailable (switch doesn't support RFC 3576), forcibly reassign the port VLAN via SNMP SET.

**OID for port VLAN assignment:**
- `1.3.6.1.2.1.17.7.1.4.5.1.1` (`dot1qPvid`) — SET to VLAN ID
- Requires SNMP read-write community or v3 with write privileges

**Verification OID:** Read `dot1qPvid` after SET to confirm assignment.
