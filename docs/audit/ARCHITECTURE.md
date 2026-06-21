# Architecture Audit — NAC Manager v0.1

Generated: 2026-06-21 | Status: Pre-production prototype

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Replit Dev Proxy (port 80)                   │
│               Routes: / → nac-manager, /api → api-server           │
└────────────────────────┬────────────────┬───────────────────────────┘
                         │                │
          ┌──────────────▼──┐       ┌─────▼──────────────────┐
          │  NAC Manager    │       │   API Server            │
          │  React + Vite   │       │   Express 5 / Node 24   │
          │  Port: 19518    │       │   Port: 8080            │
          │  artifacts/     │       │   artifacts/            │
          │  nac-manager/   │       │   api-server/           │
          └─────────────────┘       └─────────┬───────────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │   PostgreSQL (Replit) │
                                   │   Drizzle ORM         │
                                   │   lib/db/             │
                                   └──────────────────────┘
```

## Workspace Structure

```
/home/runner/workspace/
├── artifacts/
│   ├── api-server/          ← Express 5 backend (CJS bundle via esbuild)
│   │   ├── src/
│   │   │   ├── app.ts       ← Express app, middleware, routing mount
│   │   │   ├── index.ts     ← Server entry (PORT env)
│   │   │   ├── seed.ts      ← Demo data seeder (MUST BE REMOVED)
│   │   │   ├── lib/
│   │   │   │   └── logger.ts ← pino structured logger
│   │   │   └── routes/
│   │   │       ├── index.ts       ← Route registry
│   │   │       ├── health.ts      ← GET /api/healthz
│   │   │       ├── dashboard.ts   ← GET /api/dashboard/*
│   │   │       ├── devices.ts     ← /api/devices CRUD + actions
│   │   │       ├── discovery.ts   ← /api/discovery/* (SIMULATED)
│   │   │       ├── vlans.ts       ← /api/vlans CRUD
│   │   │       ├── switches.ts    ← /api/switches CRUD
│   │   │       ├── sites.ts       ← /api/sites CRUD
│   │   │       ├── radius.ts      ← /api/radius/* (DB-ONLY, NOT REAL)
│   │   │       ├── policies.ts    ← /api/policies CRUD (NOT EVALUATED)
│   │   │       ├── alerts.ts      ← /api/alerts CRUD
│   │   │       ├── audit.ts       ← /api/audit read-only
│   │   │       ├── reports.ts     ← /api/reports aggregations
│   │   │       ├── users.ts       ← /api/users CRUD
│   │   │       ├── auth.ts        ← /api/login /api/logout /api/me
│   │   │       └── cisco.ts       ← /api/cisco/generate-config (template)
│   │   ├── build.mjs        ← esbuild bundler config
│   │   ├── package.json
│   │   └── tsconfig.json    ← noImplicitReturns: false
│   │
│   ├── nac-manager/         ← React+Vite frontend (Tailwind + shadcn/ui)
│   │   └── src/
│   │       ├── App.tsx      ← Wouter router, all routes registered
│   │       ├── main.tsx     ← QueryClient, app entry
│   │       ├── index.css    ← CSS custom properties, dark-mode palette
│   │       ├── components/
│   │       │   ├── layout/MainLayout.tsx ← Persistent sidebar
│   │       │   └── ui/     ← shadcn/ui component library (55 components)
│   │       ├── pages/      ← 15 pages (all exist, all wired to API hooks)
│   │       └── hooks/
│   │
│   └── mockup-sandbox/      ← Vite component preview server (port 8081)
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     ← Source of truth for all API contracts
│   ├── api-client-react/
│   │   └── src/generated/api.ts  ← Orval-generated React Query hooks
│   ├── api-zod/
│   │   └── src/generated/api.ts  ← Orval-generated Zod validators
│   └── db/
│       ├── src/
│       │   ├── index.ts     ← Exports db client + all tables
│       │   └── schema/      ← 13 Drizzle table definitions
│       └── drizzle.config.ts
│
├── docs/
│   └── audit/               ← Phase 0 audit output (this directory)
│
├── pnpm-workspace.yaml      ← Workspace config, catalog pins
├── tsconfig.base.json       ← Shared strict TS defaults
└── tsconfig.json            ← Solution file (libs only)
```

## Data Flow (Current State)

```
Browser → Vite Dev Server
        → React Query hooks (auto-generated from OpenAPI)
        → /api/* (shared proxy)
        → Express routes
        → Drizzle ORM
        → PostgreSQL (Replit managed)
        → JSON response → UI

Discovery "jobs" → setTimeout(Math.random()) → DB update [FAKE]
RADIUS "sync"   → Set radiusSynced=true in DB [FAKE]
Quarantine      → Set status="QUARANTINED" in DB [FAKE - no switch action]
```

## Data Flow (Target State — post-implementation)

```
SNMP Poller Service    ─┐
DHCP Collector Service  ├→ Device Correlation Engine → devicesTable
DNS Resolver Service   ─┤   (MAC-keyed merge)
AD/LDAP Sync Service   ─┘

devicesTable (APPROVED) → FreeRADIUS SQL Sync → radcheck/radreply tables
                        → FreeRADIUS container (rlm_sql)

NAC Policy Engine ← RADIUS Authorization Request (MAB)
                  → RADIUS AVP response (VLAN assignment)

Quarantine action → radreply update → CoA packet → NAS port re-auth
```

## Component Maturity Matrix

| Component | Exists | Functional | Production-Ready |
|---|---|---|---|
| React frontend (UI) | ✅ | ✅ (fake data) | ❌ (tied to seed) |
| Express API (CRUD) | ✅ | ✅ | ❌ (no real integrations) |
| PostgreSQL schema | ✅ | ✅ | ⚠️ (missing indexes) |
| OpenAPI spec | ✅ | ✅ | ⚠️ (incomplete security) |
| Orval codegen | ✅ | ✅ | ✅ |
| SNMP Poller | ❌ | ❌ | ❌ |
| DHCP Collector | ❌ | ❌ | ❌ |
| DNS Resolver | ❌ | ❌ | ❌ |
| AD/LDAP Sync | ❌ | ❌ | ❌ |
| Device Correlation | ❌ | ❌ | ❌ |
| FreeRADIUS (Docker) | ❌ | ❌ | ❌ |
| FreeRADIUS SQL | ❌ | ❌ | ❌ |
| MAB Policy Engine | ❌ | ❌ | ❌ |
| Quarantine Workflow | ❌ | ❌ | ❌ |
| Connection Tests | ❌ | ❌ | ❌ |
| Docker Compose | ❌ | ❌ | ❌ |
| Authentication (prod) | ❌ | ❌ | ❌ |
| Session management | ❌ | ❌ | ❌ |
| CSRF protection | ❌ | ❌ | ❌ |
| Rate limiting | ❌ | ❌ | ❌ |
| Retry logic | ❌ | ❌ | ❌ |
| Structured job logs | ❌ | ❌ | ❌ |
| Unit tests | ❌ | ❌ | ❌ |
| Integration tests | ❌ | ❌ | ❌ |
