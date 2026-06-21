# Gap Analysis — NAC Manager v0.1 vs. Production Requirements

Generated: 2026-06-21

This document maps every master requirement to its current implementation state and the phase that closes the gap.

---

## Phase-by-Phase Gap Table

### Phase 0 — Codebase Audit
| Deliverable | Status |
|---|---|
| Architecture diagram | ✅ `docs/audit/ARCHITECTURE.md` |
| API inventory | ✅ `docs/audit/API_INVENTORY.md` |
| Database inventory | ✅ `docs/audit/DATABASE_INVENTORY.md` |
| Pages inventory | ✅ `docs/audit/PAGES_INVENTORY.md` |
| Integrations inventory | ✅ `docs/audit/INTEGRATIONS_INVENTORY.md` |
| Technical debt report | ✅ `docs/audit/TECHNICAL_DEBT.md` |
| Dependency report | ✅ `docs/audit/DEPENDENCY_REPORT.md` |

---

### Phase 1 — Infrastructure Foundation
| Requirement | Status | Gap |
|---|---|---|
| Dockerfile (API) | ❌ | Full |
| Dockerfile (Frontend) | ❌ | Full |
| docker-compose.yml | ❌ | Full |
| PostgreSQL persistent storage | ❌ | Full |
| FreeRADIUS container | ❌ | Full |
| FreeRADIUS SQL schema | ❌ | Full |
| Nginx reverse proxy | ❌ | Full |
| .env.example | ❌ | Full |
| Health checks (all services) | ❌ | Full |
| Startup validation scripts | ❌ | Full |
| DB indexes migration | ❌ | Full |
| DB FK constraints migration | ❌ | Full |
| /docs/deployment/ | ❌ | Full |

---

### Phase 2 — SNMP Poller Service
| Requirement | Status | Gap |
|---|---|---|
| SNMPv2c polling | ❌ | Full |
| SNMPv3 polling (auth/priv) | ❌ | Full |
| ARP table walk | ❌ | Full |
| MAC address table walk | ❌ | Full |
| Interface table walk | ❌ | Full |
| VLAN table walk | ❌ | Full |
| CDP neighbor discovery | ❌ | Full |
| Connection test endpoint | ❌ | Full |
| Per-job structured logs | ❌ | Full |
| Retry logic (exponential backoff) | ❌ | Full |
| Polling scheduler | ❌ | Full |
| Health check | ❌ | Full |
| Simulated job removal | ❌ | Must remove `Math.random()` |

---

### Phase 3 — DHCP Collector
| Requirement | Status | Gap |
|---|---|---|
| Windows DHCP (WinRM/PowerShell) | ❌ | Full |
| ISC DHCP (SSH + lease file parser) | ❌ | Full |
| IP/MAC/hostname/lease extraction | ❌ | Full |
| Connection test | ❌ | Full |
| Audit logs | ❌ | Full |
| Retry logic | ❌ | Full |
| Health check | ❌ | Full |

---

### Phase 4 — DNS Resolver
| Requirement | Status | Gap |
|---|---|---|
| Bulk reverse DNS (PTR) | ❌ | Full |
| Forward DNS (A record) | ❌ | Full |
| Windows DNS zone query | ❌ | Full |
| BIND AXFR zone transfer | ❌ | Full |
| Connection test | ❌ | Full |
| Retry logic | ❌ | Full |
| Health check | ❌ | Full |

---

### Phase 5 — Active Directory / LDAP
| Requirement | Status | Gap |
|---|---|---|
| LDAP bind (plain + StartTLS) | ❌ | Full |
| LDAPS bind (SSL) | ❌ | Full |
| Computer object sync | ❌ | Full |
| User object correlation | ❌ | Full |
| Department/OU enrichment | ❌ | Full |
| Encrypted credential storage | ❌ | Full |
| Incremental sync (uSNChanged) | ❌ | Full |
| Connection test | ❌ | Full |
| Retry logic | ❌ | Full |
| Health check | ❌ | Full |

---

### Phase 6 — Device Correlation Engine
| Requirement | Status | Gap |
|---|---|---|
| MAC-keyed merge from all sources | ❌ | Full |
| SNMP wins for switch/port | ❌ | Full |
| DHCP wins for IP/hostname | ❌ | Full |
| AD wins for user/department/OS | ❌ | Full |
| Duplicate MAC detection + alert | ❌ | Full |
| Duplicate IP detection + alert | ❌ | Full |
| Port move detection + alert | ❌ | Full |
| Device history recording | ⚠️ | Table exists; engine missing |
| Confidence scoring per field | ❌ | Full |
| `switch_id` FK migration | ❌ | Full |

---

### Phase 7 — FreeRADIUS SQL Integration
| Requirement | Status | Gap |
|---|---|---|
| radcheck writes (approved MACs) | ❌ | Full |
| radreply writes (VLAN AVPs) | ❌ | Full |
| radusergroup writes | ❌ | Full |
| Atomic NAC DB + RADIUS DB sync | ❌ | Full |
| Auto-remove on reject/quarantine | ❌ | Full |
| No manual RADIUS file edits | ❌ | Full |
| GUI-controlled sync | ⚠️ | UI exists; backend is fake |
| radtest probe endpoint | ❌ | Full |
| FreeRADIUS SQL schema migration | ❌ | Full |

---

### Phase 8 — MAB Policy Engine
| Requirement | Status | Gap |
|---|---|---|
| Policy evaluator (priority order) | ❌ | Full |
| `known_device` condition | ❌ | Full |
| `unknown_device` condition | ❌ | Full |
| `rejected_device` condition | ❌ | Full |
| `duplicate_mac` condition | ❌ | Full |
| `duplicate_ip` condition | ❌ | Full |
| `port_change` condition | ❌ | Full |
| `assign_vlan` action | ❌ | Full |
| `deny_access` action | ❌ | Full |
| `quarantine` action | ❌ | Full |
| `alert` action | ❌ | Full |
| `POST /radius/authorize` hook | ❌ | Full |
| `POST /radius/accounting` hook | ❌ | Full |
| FreeRADIUS `rlm_rest` config | ❌ | Full |

---

### Phase 9 — Quarantine VLAN Workflow
| Requirement | Status | Gap |
|---|---|---|
| Quarantine → radreply write | ❌ | Full |
| RADIUS CoA dispatch | ❌ | Full |
| VLAN assignment verification | ❌ | Full |
| Quarantine audit log | ⚠️ | Partial (no enforcement recorded) |
| Approve → production VLAN CoA | ❌ | Full |
| SNMP VLAN write fallback | ❌ | Full |
| CoA log table | ❌ | Full |

---

### Phase 10 — Discovery Workflow
| Requirement | Status | Gap |
|---|---|---|
| Discovered → Pending state | ✅ | State model exists |
| Pending → Approved → RADIUS | ❌ | Approval doesn't write RADIUS |
| Unknown device → Quarantine auto | ❌ | No policy engine |
| Bulk approval | ⚠️ | DB only, no RADIUS |
| Active session tracking | ❌ | No RADIUS accounting |

---

### Phase 11 — Connection Test Framework
| Requirement | Status | Gap |
|---|---|---|
| SNMP connection test | ❌ | Full |
| DHCP connection test | ❌ | Full |
| DNS connection test | ❌ | Full |
| LDAP connection test | ❌ | Full |
| FreeRADIUS connection test | ❌ | Full |
| Test result storage (latency, error, timestamp) | ❌ | Full |
| `connection_tests` table | ❌ | Full |

---

### Phase 12 — Logging & Audit
| Requirement | Status | Gap |
|---|---|---|
| Structured pino logs | ✅ | Working |
| Audit log (user actions) | ⚠️ | Partial (manual writes only) |
| Job logs (per-integration) | ❌ | Full |
| Integration error logs | ❌ | Full |
| Log export (CSV/JSON) | ❌ | Full |
| `integration_logs` table | ❌ | Full |
| `GET /audit/export` endpoint | ❌ | Full |

---

### Phase 13 — Security
| Requirement | Status | Gap |
|---|---|---|
| bcrypt password hashing | ❌ | SHA-256 in use |
| Session management | ❌ | No sessions |
| Auth middleware (all routes) | ❌ | No guards |
| RBAC enforcement | ❌ | No role checks |
| CSRF protection | ❌ | None |
| Rate limiting | ❌ | None |
| Security headers (Helmet) | ❌ | None |
| Encrypted credential storage | ❌ | Plaintext |
| Restricted CORS | ❌ | Wildcard |

---

### Phase 14 — Testing
| Requirement | Status | Gap |
|---|---|---|
| Unit tests | ❌ | Full |
| Integration tests | ❌ | Full |
| API tests | ❌ | Full |
| SNMP tests | ❌ | Full |
| LDAP tests | ❌ | Full |
| FreeRADIUS tests | ❌ | Full |
| Test reports | ❌ | Full |

---

### Phase 15 — Documentation
| Deliverable | Status |
|---|---|
| README.md | ❌ |
| INSTALLATION.md | ❌ |
| DEPLOYMENT.md | ❌ |
| ARCHITECTURE.md | ⚠️ `docs/audit/ARCHITECTURE.md` (audit only) |
| DATABASE.md | ⚠️ `docs/audit/DATABASE_INVENTORY.md` (audit only) |
| API.md | ⚠️ `docs/audit/API_INVENTORY.md` (audit only) |
| SECURITY.md | ❌ |
| BACKUP.md | ❌ |
| DISASTER_RECOVERY.md | ❌ |
| OPERATIONS_RUNBOOK.md | ❌ |
| FREERADIUS_GUIDE.md | ❌ |
| CISCO_2960X_GUIDE.md | ❌ |
| TROUBLESHOOTING.md | ❌ |
| CHANGELOG.md | ❌ |

---

## Overall Completion

| Phase | Completion |
|---|---|
| Phase 0 — Audit | ✅ 100% |
| Phase 1 — Infrastructure | 0% |
| Phase 2 — SNMP Poller | 0% |
| Phase 3 — DHCP Collector | 0% |
| Phase 4 — DNS Resolver | 0% |
| Phase 5 — AD/LDAP | 0% |
| Phase 6 — Correlation Engine | 5% (table exists) |
| Phase 7 — RADIUS SQL | 5% (UI exists, fake backend) |
| Phase 8 — MAB Policy Engine | 5% (CRUD exists, no evaluation) |
| Phase 9 — Quarantine Workflow | 10% (DB state only) |
| Phase 10 — Discovery Workflow | 15% (state model + UI) |
| Phase 11 — Connection Tests | 0% |
| Phase 12 — Logging | 20% (pino + partial audit) |
| Phase 13 — Security | 5% (schema only) |
| Phase 14 — Testing | 0% |
| Phase 15 — Documentation | 5% (audit docs only) |
| **Overall** | **~6%** |
