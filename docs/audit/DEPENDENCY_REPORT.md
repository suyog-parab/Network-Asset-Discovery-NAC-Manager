# Dependency Report — NAC Manager v0.1

Generated: 2026-06-21 | Package manager: pnpm 10.x | Node: 24.x | TypeScript: 5.9.x

---

## Workspace Root (`package.json`)

| Package | Version | Type | Purpose |
|---|---|---|---|
| `typescript` | ~5.9.3 | devDep | TypeScript compiler |
| `prettier` | ^3.8.3 | devDep | Code formatter |
| `tsx` | catalog:4.21.0 | dep | TypeScript executor for scripts |

---

## API Server (`artifacts/api-server/package.json`)

### Runtime Dependencies

| Package | Version | Purpose | Production-Safe? |
|---|---|---|---|
| `express` | ^5.2.1 | HTTP framework | ✅ |
| `cors` | ^2.8.6 | CORS middleware | ⚠️ wildcard config |
| `cookie-parser` | ^1.4.7 | Cookie parsing | ✅ |
| `drizzle-orm` | catalog:^0.45.2 | ORM | ✅ |
| `pino` | ^9.14.0 | Structured logging | ✅ |
| `pino-http` | ^10.5.0 | HTTP request logging | ✅ |
| `@workspace/db` | workspace:* | DB client + schema | ✅ |
| `@workspace/api-zod` | workspace:* | Zod validators | ✅ |

### Dev Dependencies (Build Only)

| Package | Version | Purpose |
|---|---|---|
| `esbuild` | 0.27.3 | Bundler |
| `esbuild-plugin-pino` | ^2.3.3 | Pino worker file handling |
| `pino-pretty` | ^13.1.3 | Dev log formatting |
| `thread-stream` | 3.1.0 | Pino worker transport |
| `@types/express` | ^5.0.6 | Type definitions |
| `@types/cors` | ^2.8.19 | Type definitions |
| `@types/cookie-parser` | ^1.4.10 | Type definitions |
| `@types/node` | catalog:^25.3.3 | Node type definitions |

### Missing Dependencies (Required for Full Implementation)

| Package | Purpose | Phase |
|---|---|---|
| `net-snmp` | SNMP v1/v2c/v3 client | Phase 2 |
| `ssh2` | SSH client for ISC DHCP collection | Phase 3 |
| `ldapts` | LDAP/LDAPS client for AD sync | Phase 5 |
| `bcrypt` | Password hashing (replace SHA-256) | Phase 13 |
| `express-session` | Session management | Phase 13 |
| `connect-pg-simple` | PostgreSQL session store | Phase 13 |
| `helmet` | Security headers | Phase 13 |
| `express-rate-limit` | Rate limiting | Phase 13 |
| `pg` | Direct PostgreSQL client (for FreeRADIUS SQL writes) | Phase 7 |
| `pg-boss` | PostgreSQL-native job queue | Phase 2 |
| `node-cron` | Scheduled polling | Phase 2 |
| `@types/bcrypt` | Type definitions | Phase 13 |
| `@types/express-session` | Type definitions | Phase 13 |

---

## Database Library (`lib/db/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `drizzle-orm` | catalog:^0.45.2 | ORM |
| `drizzle-kit` | (dev) | Schema push/migration |
| `drizzle-zod` | (dev) | Insert schema generation |
| `pg` | — | PostgreSQL driver |

---

## API Spec Library (`lib/api-spec/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `orval` | 8.9.1 | OpenAPI → TypeScript codegen |

---

## API Client React (`lib/api-client-react/package.json`)

| Package | Version | Purpose |
|---|---|---|
| `@tanstack/react-query` | catalog:^5.90.21 | Server state management |
| `axios` | — | HTTP client (Orval-generated) |

---

## Frontend (`artifacts/nac-manager/package.json`)

### Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | catalog:19.1.0 | UI framework |
| `react-dom` | catalog:19.1.0 | DOM renderer |
| `vite` | catalog:^7.3.2 | Build tool / dev server |
| `wouter` | catalog:^3.3.5 | Client-side router |
| `tailwindcss` | catalog:^4.1.14 | CSS framework |
| `@tanstack/react-query` | catalog:^5.90.21 | Server state |
| `recharts` | — | Charts (bar, donut) |
| `lucide-react` | catalog:^0.545.0 | Icon library |
| `react-hook-form` | — | Form management |
| `@hookform/resolvers` | ^3.10.0 | Zod form integration |
| `zod` | catalog:^3.25.76 | Schema validation |
| `framer-motion` | catalog:^12.23.24 | Animations |
| `class-variance-authority` | catalog:^0.7.1 | Variant class builder |
| `clsx` | catalog:^2.1.1 | Class merging |
| `tailwind-merge` | catalog:^3.3.1 | Tailwind dedup |

### Radix UI Components (shadcn/ui)

All `@radix-ui/react-*` packages at ^1.x/^2.x for accessible primitives.

---

## Catalog Pins (`pnpm-workspace.yaml`)

```yaml
catalog:
  tsx: 4.21.0
  vite: ^7.3.2
  drizzle-orm: ^0.45.2
  react: 19.1.0
  react-dom: 19.1.0
  zod: ^3.25.76
  wouter: ^3.3.5
  tailwindcss: ^4.1.14
  @tanstack/react-query: ^5.90.21
  lucide-react: ^0.545.0
  framer-motion: ^12.23.24
```

---

## Security Audit — Known Issues

| Package | Issue | Severity |
|---|---|---|
| No `helmet` | Missing security headers (CSP, HSTS, X-Frame, etc.) | HIGH |
| No `express-rate-limit` | Login endpoint unlimited | HIGH |
| No auth middleware | All routes unprotected | CRITICAL |
| `cors()` wildcard | All origins accepted | MEDIUM |
| SHA-256 password hash | Not `bcrypt`/`argon2` | CRITICAL |

---

## Node.js Built-ins Used (No Install Required)

| Module | Usage |
|---|---|
| `crypto` | SHA-256 password hashing (must replace with bcrypt) |
| `dns` | Available for reverse DNS lookups (Phase 4) |
| `net` | TCP port reachability tests |
| `dgram` | UDP for RADIUS CoA packets (Phase 9) |

---

## Recommended Dependency Additions — Phase-by-Phase

### Phase 1 (Infrastructure)
```bash
# No new npm deps — Docker and compose files only
```

### Phase 2 (SNMP)
```bash
pnpm --filter @workspace/api-server add net-snmp pg-boss node-cron
pnpm --filter @workspace/api-server add -D @types/node-cron
```

### Phase 3 (DHCP)
```bash
pnpm --filter @workspace/api-server add ssh2
pnpm --filter @workspace/api-server add -D @types/ssh2
```

### Phase 4 (DNS)
```bash
# Uses Node.js built-in dns.promises — no install needed
```

### Phase 5 (LDAP)
```bash
pnpm --filter @workspace/api-server add ldapts
```

### Phase 7 (FreeRADIUS SQL)
```bash
pnpm --filter @workspace/api-server add pg
pnpm --filter @workspace/api-server add -D @types/pg
```

### Phase 13 (Security)
```bash
pnpm --filter @workspace/api-server add bcrypt express-session connect-pg-simple helmet express-rate-limit
pnpm --filter @workspace/api-server add -D @types/bcrypt @types/express-session @types/connect-pg-simple
```
