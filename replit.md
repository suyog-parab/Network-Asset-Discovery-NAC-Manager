# NAC Manager

A full-stack Network Asset Discovery & NAC (Network Access Control) Manager platform for network engineers, security admins, and IT helpdesk teams to discover devices, manage inventory, enforce NAC policies, and sync approved devices to FreeRADIUS.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/api-server run seed` — seed example data (safe to re-run, checks for existing rows)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, routes at `/api/*`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind + shadcn/ui, wouter routing, recharts
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (one file per table)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod validators
- `artifacts/api-server/src/routes/` — Express route handlers (one per module)
- `artifacts/nac-manager/src/pages/` — React pages (one per module)
- `artifacts/api-server/src/seed.ts` — demo data seed script

## Architecture decisions

- OpenAPI-first: all API contracts live in `openapi.yaml`, Zod validators and React Query hooks are generated. Never write raw fetch calls on the frontend.
- `noImplicitReturns: false` in `artifacts/api-server/tsconfig.json` — Express 5 early-return pattern (`return res.json(...)`) would otherwise trigger TS7030 on every handler.
- Zod schema names: policies use `CreatePolicyBody`/`UpdatePolicyBody`, NOT `CreateNacPolicyBody`.
- Password hashing: SHA-256 + "nac-salt" via Node crypto (no bcrypt dependency). Not for production — swap to bcrypt before going live.
- Always run `pnpm run typecheck:libs` after adding DB schema tables so `@workspace/db` re-emits fresh declarations.

## Product

- **Dashboard**: Live stats, VLAN/site/department charts, recent activity feed
- **Device Inventory**: Paginated/filtered table, approve/reject/quarantine actions, bulk operations, device detail + history
- **Quarantine**: Isolated view of quarantined devices with approve/reject actions
- **Discovery**: Manage SNMP/DHCP/DNS/AD sources, trigger and track jobs
- **VLANs, Switches, Sites**: Infrastructure topology management
- **FreeRADIUS**: Client and group management, device sync
- **NAC Policies**: Condition → action rules with priority and enable/disable
- **Alerts**: Severity-filtered alert table with acknowledge/resolve workflow
- **Cisco Config Generator**: IOS CLI generator for dot1x/MAB with code copy
- **Reports**: Inventory and compliance charts with breakdown stats
- **Audit Log**: Paginated log of all platform actions
- **User Management**: Role-based user table (super_admin / network_admin / helpdesk / auditor / read_only)

## Login credentials (dev seed)

- admin / admin123 (super_admin)
- netadmin / netadmin123 (network_admin)
- helpdesk1 / help123 (helpdesk)
- auditor / audit123 (auditor)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After adding new DB tables, run `pnpm run typecheck:libs` before checking routes — stale lib declarations cause TS2305.
- Seed script checks for existing rows; safe to re-run after schema changes.
- The API server must rebuild (`pnpm run dev` in its workflow) after any route changes — it bundles at startup.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
