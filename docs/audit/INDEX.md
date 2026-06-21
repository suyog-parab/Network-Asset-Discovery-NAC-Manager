# Phase 0 Audit — Index

Generated: 2026-06-21 | NAC Manager v0.1

No production code was modified during this audit.

---

## Audit Documents

| File | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, workspace structure, component maturity matrix |
| [API_INVENTORY.md](API_INVENTORY.md) | All 68 API endpoints, implementation status, gaps |
| [DATABASE_INVENTORY.md](DATABASE_INVENTORY.md) | All 13 tables, column definitions, missing indexes/FKs, missing RADIUS tables |
| [PAGES_INVENTORY.md](PAGES_INVENTORY.md) | All 15 pages, hook wiring, real vs. fake data status |
| [INTEGRATIONS_INVENTORY.md](INTEGRATIONS_INVENTORY.md) | SNMP/DHCP/DNS/LDAP/RADIUS integration requirements and current state |
| [TECHNICAL_DEBT.md](TECHNICAL_DEBT.md) | 24 debt items, CRITICAL→LOW priority, fix phase mapping |
| [DEPENDENCY_REPORT.md](DEPENDENCY_REPORT.md) | All npm packages, missing packages per phase, security issues |
| [GAP_ANALYSIS.md](GAP_ANALYSIS.md) | Every requirement mapped to implementation state and phase |

---

## Key Findings

### What Works
- PostgreSQL schema (13 tables) — correct structure, missing constraints and indexes
- React UI (15 pages) — all pages render, hooks wired to API
- CRUD APIs for: devices, VLANs, switches, sites, RADIUS clients/groups, policies, alerts, audit, reports, users, sites
- OpenAPI spec + Orval codegen pipeline — generates hooks and Zod validators
- Pino structured logging on API server
- Cisco IOS config template generator

### What Does Not Work (Critical)
1. **Discovery is simulated** — `Math.random()` fake device counts, no SNMP/DHCP/DNS/AD integration
2. **RADIUS sync is fake** — sets a DB flag, never contacts FreeRADIUS
3. **Quarantine has no enforcement** — device stays on its VLAN
4. **Policy engine does not evaluate** — policies stored but never executed
5. **Authentication is absent** — all API routes publicly accessible
6. **Passwords are SHA-256** — insecure, must be replaced with bcrypt

### Recommended Next Step
**Phase 1: Infrastructure Foundation**
- Docker Compose with PostgreSQL, FreeRADIUS, API, Frontend, Nginx
- FreeRADIUS SQL schema migrations
- DB performance indexes
- FK constraints
- Real health check endpoint
- Removes seed data dependency

Phase 1 establishes the deployment foundation all subsequent phases build on.
