# API Inventory — NAC Manager v0.1

Generated: 2026-06-21 | Base path: `/api`

---

## Authentication

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| POST | `/login` | `auth.ts` | ❌ | SHA-256 hash, no session middleware |
| POST | `/logout` | `auth.ts` | ❌ | Returns `{success:true}`, no session teardown |
| GET | `/me` | `auth.ts` | ❌ | Returns first super_admin user, no JWT/session check |

**Auth gap:** No middleware guards any route. Every endpoint is publicly accessible.

---

## Health

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/healthz` | `health.ts` | ⚠️ | Returns `{status:"ok"}`. No DB ping, no external service checks |

---

## Dashboard

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/dashboard/stats` | `dashboard.ts` | ✅ | Real DB aggregations |
| GET | `/dashboard/devices-by-vlan` | `dashboard.ts` | ✅ | Real JOIN |
| GET | `/dashboard/devices-by-site` | `dashboard.ts` | ✅ | Real JOIN |
| GET | `/dashboard/devices-by-department` | `dashboard.ts` | ✅ | Real GROUP BY |
| GET | `/dashboard/recent-activity` | `dashboard.ts` | ✅ | Real audit_logs SELECT |

---

## Devices

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/devices` | `devices.ts` | ✅ | Paginated, filterable |
| POST | `/devices` | `devices.ts` | ✅ | Creates device record |
| GET | `/devices/:id` | `devices.ts` | ✅ | With VLAN+site enrichment |
| PUT | `/devices/:id` | `devices.ts` | ✅ | Updates device record |
| DELETE | `/devices/:id` | `devices.ts` | ✅ | Deletes device |
| POST | `/devices/:id/approve` | `devices.ts` | ⚠️ | Sets status=APPROVED in DB only. No RADIUS write |
| POST | `/devices/:id/reject` | `devices.ts` | ⚠️ | Sets status=REJECTED in DB only |
| POST | `/devices/:id/quarantine` | `devices.ts` | ❌ | Sets status=QUARANTINED in DB. Switch port NOT reassigned |
| GET | `/devices/:id/history` | `devices.ts` | ✅ | Real device_history SELECT |
| POST | `/devices/bulk-approve` | `devices.ts` | ⚠️ | DB only, no RADIUS write |
| POST | `/devices/bulk-reject` | `devices.ts` | ⚠️ | DB only |
| POST | `/devices/bulk-vlan` | `devices.ts` | ⚠️ | DB only, no switch action |

---

## Discovery

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/discovery/jobs` | `discovery.ts` | ✅ | Reads from DB |
| POST | `/discovery/jobs` | `discovery.ts` | ❌ | **SIMULATED** — `setTimeout(Math.random() * 20)` |
| GET | `/discovery/jobs/:id` | `discovery.ts` | ✅ | Reads from DB |
| GET | `/discovery/sources` | `discovery.ts` | ✅ | Reads from DB |
| POST | `/discovery/sources` | `discovery.ts` | ✅ | Creates source record |
| PUT | `/discovery/sources/:id` | `discovery.ts` | ✅ | Updates source record |
| DELETE | `/discovery/sources/:id` | `discovery.ts` | ✅ | Deletes source record |

**Missing:** `POST /discovery/sources/:id/test` — connection test endpoint

---

## VLANs

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/vlans` | `vlans.ts` | ✅ | With device counts |
| POST | `/vlans` | `vlans.ts` | ✅ | Creates VLAN |
| GET | `/vlans/:id` | `vlans.ts` | ✅ | With device count |
| PUT | `/vlans/:id` | `vlans.ts` | ✅ | Updates VLAN |
| DELETE | `/vlans/:id` | `vlans.ts` | ✅ | Deletes VLAN |

---

## Switches

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/switches` | `switches.ts` | ✅ | With site enrichment |
| POST | `/switches` | `switches.ts` | ✅ | Creates switch |
| GET | `/switches/:id` | `switches.ts` | ✅ | With site |
| PUT | `/switches/:id` | `switches.ts` | ✅ | Updates switch |
| DELETE | `/switches/:id` | `switches.ts` | ✅ | Deletes switch |

**Missing:** `POST /switches/:id/test-snmp` — SNMP connection test

---

## Sites

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/sites` | `sites.ts` | ✅ | With device/switch counts via raw SQL |
| POST | `/sites` | `sites.ts` | ✅ | Creates site |
| GET | `/sites/:id` | `sites.ts` | ✅ | Single site |
| PUT | `/sites/:id` | `sites.ts` | ✅ | Updates site |
| DELETE | `/sites/:id` | `sites.ts` | ✅ | Deletes site |

---

## FreeRADIUS

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/radius/clients` | `radius.ts` | ✅ | Reads radius_clients table |
| POST | `/radius/clients` | `radius.ts` | ✅ | Creates client record |
| PUT | `/radius/clients/:id` | `radius.ts` | ✅ | Updates client |
| DELETE | `/radius/clients/:id` | `radius.ts` | ✅ | Deletes client |
| GET | `/radius/groups` | `radius.ts` | ✅ | Reads radius_groups table |
| POST | `/radius/groups` | `radius.ts` | ✅ | Creates group |
| PUT | `/radius/groups/:id` | `radius.ts` | ✅ | Updates group |
| DELETE | `/radius/groups/:id` | `radius.ts` | ✅ | Deletes group |
| POST | `/radius/sync` | `radius.ts` | ❌ | **FAKE** — sets `radiusSynced=true` in devices table only. No FreeRADIUS contact |
| GET | `/radius/sync-status` | `radius.ts` | ⚠️ | Reads from devices table, no real RADIUS health |

**Missing:**
- `POST /radius/authorize` — MAB authorization hook for FreeRADIUS rlm_rest
- `POST /radius/accounting` — RADIUS accounting handler
- `POST /radius/test` — radtest probe
- `POST /radius/coa/:deviceId` — Change of Authorization dispatch

---

## NAC Policies

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/policies` | `policies.ts` | ✅ | Reads nac_policies table |
| POST | `/policies` | `policies.ts` | ✅ | Creates policy |
| PUT | `/policies/:id` | `policies.ts` | ✅ | Updates policy |
| DELETE | `/policies/:id` | `policies.ts` | ✅ | Deletes policy |

**Critical gap:** Policies are stored but NEVER evaluated. No policy engine exists.

---

## Alerts

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/alerts` | `alerts.ts` | ✅ | Paginated, filterable |
| GET | `/alerts/counts` | `alerts.ts` | ✅ | Severity counts |
| POST | `/alerts/:id/acknowledge` | `alerts.ts` | ✅ | Updates status |
| POST | `/alerts/:id/resolve` | `alerts.ts` | ✅ | Updates status |

---

## Audit Log

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/audit` | `audit.ts` | ✅ | Paginated |

---

## Reports

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/reports/inventory` | `reports.ts` | ✅ | Real DB aggregations |
| GET | `/reports/compliance` | `reports.ts` | ✅ | Real DB aggregations |

---

## Users

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| GET | `/users` | `users.ts` | ✅ | Lists users (password stripped) |
| POST | `/users` | `users.ts` | ⚠️ | Creates user with SHA-256 hash |
| GET | `/users/:id` | `users.ts` | ✅ | Single user |
| PUT | `/users/:id` | `users.ts` | ✅ | Updates user |
| DELETE | `/users/:id` | `users.ts` | ✅ | Deletes user |

---

## Cisco Config Generator

| Method | Path | Handler | Real? | Notes |
|---|---|---|---|---|
| POST | `/cisco/generate-config` | `cisco.ts` | ✅ | Real template generation, no switch contact |

---

## Summary

| Category | Total Endpoints | Real/Functional | Simulated/Fake | Missing |
|---|---|---|---|---|
| Auth | 3 | 0 | 3 | Session middleware, RBAC guards |
| Dashboard | 5 | 5 | 0 | — |
| Devices | 11 | 6 | 5 | — |
| Discovery | 7 | 5 | 2 | `/test`, `/sources/:id/test` |
| VLANs | 5 | 5 | 0 | — |
| Switches | 5 | 5 | 0 | `/test-snmp` |
| Sites | 5 | 5 | 0 | — |
| FreeRADIUS | 10 | 8 | 2 | `/authorize`, `/accounting`, `/test`, `/coa/:id` |
| Policies | 4 | 4 | 0 | Policy evaluator engine |
| Alerts | 4 | 4 | 0 | Alert auto-generation |
| Audit | 1 | 1 | 0 | — |
| Reports | 2 | 2 | 0 | — |
| Users | 5 | 3 | 2 | — |
| Cisco | 1 | 1 | 0 | — |
| **Total** | **68** | **54** | **14** | **~12 new** |
