---
name: NAC Manager project
description: Key architecture decisions and gotchas for the Network Asset Discovery & NAC Manager platform.
---

## Stack
- React+Vite frontend at `artifacts/nac-manager/` (previewPath `/`)
- Express 5 API at `artifacts/api-server/` (port 8080, proxied at `/api`)
- PostgreSQL + Drizzle ORM in `lib/db/src/schema/`
- OpenAPI spec at `lib/api-spec/openapi.yaml`, hooks in `lib/api-client-react/`, Zod in `lib/api-zod/`

## Decisions

**noImplicitReturns: false** in `artifacts/api-server/tsconfig.json`
**Why:** Express 5 route handlers use `return res.json(...)` early-exit pattern which TS7030 flags as "not all code paths return a value". Disabling noImplicitReturns at artifact level avoids rewriting every handler.

**Password hashing via crypto.createHash(sha256) + "nac-salt"**
**Why:** No bcrypt dependency added to keep install simple. Seed uses same hash function.

**Seed script**: `pnpm --filter @workspace/api-server run seed` (uses workspace tsx)
**How to apply:** Run after any DB push to restore demo data. Checks for existing rows to avoid duplicates.

**Zod schema names to use from @workspace/api-zod:**
- Policies: `CreatePolicyBody`, `UpdatePolicyBody` (NOT CreateNacPolicyBody)
- RADIUS sync: `SyncToRadiusBody`
- Auth: `LoginBody`

**DB lib rebuild:** Always run `pnpm run typecheck:libs` after adding new tables to `lib/db/src/schema/index.ts`, or the route files will see stale type exports from `@workspace/db`.
