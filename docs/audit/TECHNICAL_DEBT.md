# Technical Debt Report — NAC Manager v0.1

Generated: 2026-06-21 | Priority: CRITICAL → HIGH → MEDIUM → LOW

---

## CRITICAL — Must fix before any production use

### TD-001: Simulated Discovery Engine
**Location:** `artifacts/api-server/src/routes/discovery.ts` lines 34–54
**Description:** `POST /discovery/jobs` uses `setTimeout(Math.random() * 20)` to fake device discovery results. No SNMP, DHCP, DNS, or AD integration exists.
**Impact:** Core platform functionality does not exist. All "discovered" devices are fabricated.
**Fix:** Replace with real service dispatchers (Phases 2–5).

---

### TD-002: Simulated FreeRADIUS Sync
**Location:** `artifacts/api-server/src/routes/radius.ts` lines 82–108
**Description:** `POST /radius/sync` marks `radiusSynced=true` in the NAC database. No packet is sent to FreeRADIUS. No `radcheck`/`radreply` table is written.
**Impact:** Approved devices are NOT actually permitted on the network. Rejected devices are NOT blocked. The NAC platform enforces nothing.
**Fix:** Implement real FreeRADIUS SQL sync (Phase 7).

---

### TD-003: Quarantine Has No Network Enforcement
**Location:** `artifacts/api-server/src/routes/devices.ts` lines 220–236
**Description:** `POST /devices/:id/quarantine` sets `status='QUARANTINED'` in the database. The switch port is not reassigned. No RADIUS CoA is sent. The device continues on its current VLAN.
**Impact:** Quarantine is purely cosmetic. A quarantined device has full network access.
**Fix:** Implement CoA + RADIUS SQL update (Phase 9).

---

### TD-004: Insecure Password Hashing
**Location:** `artifacts/api-server/src/routes/auth.ts` and `users.ts`
**Description:** `createHash("sha256").update(password + "nac-salt")` — SHA-256 with a static, hardcoded salt. This is a single fast hash with no work factor.
**Impact:** Password database is trivially crackable with a GPU. A stolen DB dump exposes all credentials.
**Fix:** Replace with `bcrypt` (cost factor ≥ 12) or `argon2id` (Phase 13).

---

### TD-005: No Authentication Middleware
**Location:** `artifacts/api-server/src/routes/index.ts`
**Description:** Zero authentication middleware. Every API endpoint (`/api/devices`, `/api/users`, `/api/radius/sync`, etc.) is fully accessible without any token or session.
**Impact:** Complete unauthorized access to all data and all actions. Anyone with network access can approve devices, quarantine endpoints, read RADIUS secrets, delete users.
**Fix:** Implement session middleware + route guards (Phase 13).

---

### TD-006: Plaintext Credential Storage
**Location:** `lib/db/src/schema/switches.ts`, `discovery_sources.ts`, `radius_clients.ts`
**Description:** SNMP community strings, SNMP v3 passwords, Windows/Linux SSH/WinRM credentials, RADIUS shared secrets stored as plain TEXT in PostgreSQL.
**Impact:** A read-only DB compromise exposes all network credentials.
**Fix:** Encrypt with AES-256-GCM using a key from env before storing (Phase 13).

---

### TD-007: Seed Data Must Be Removed
**Location:** `artifacts/api-server/src/seed.ts`
**Description:** Creates fake MAC addresses, fake IP addresses, fake devices, fake alerts, fake discovery jobs. Explicitly violates the "no mock data" requirement.
**Impact:** Production data quality is undefined when seed rows coexist with real discovered devices.
**Fix:** Delete `seed.ts`. Provide a database reset script instead (Phase 1).

---

### TD-008: NAC Policy Engine Does Not Execute
**Location:** `artifacts/api-server/src/routes/policies.ts`
**Description:** `nac_policies` table stores CRUD records. No code evaluates policies against any input. FreeRADIUS has no hook to the policy engine. Unknown devices are not quarantined automatically.
**Impact:** The entire NAC enforcement model is non-functional.
**Fix:** Implement policy evaluator + RADIUS authorization endpoint (Phase 8).

---

## HIGH — Fix before external testing

### TD-009: Missing Database Indexes
**Description:** No indexes on `devices.status`, `devices.vlan_id`, `devices.last_seen`, `device_history.device_id`, `audit_logs.created_at`, `alerts.status`. A table of 10,000+ devices will degrade badly.
**Fix:** Migration to add all indexes (Phase 1).

---

### TD-010: Missing Foreign Key Constraints
**Description:** No FK constraints between: `devices.vlan_id → vlans.id`, `devices.site_id → sites.id`, `switches.site_id → sites.id`, `device_history.device_id → devices.id`, etc.
**Impact:** Orphaned records, data integrity violations, no cascade delete.
**Fix:** Migration to add FK constraints with appropriate cascade rules (Phase 1).

---

### TD-011: Health Check Does Not Check Anything
**Location:** `artifacts/api-server/src/routes/health.ts`
**Description:** Returns `{status:"ok"}` unconditionally. Does not ping PostgreSQL, does not check RADIUS reachability.
**Fix:** Implement real DB ping + external service checks (Phase 1).

---

### TD-012: No CSRF Protection
**Description:** The Express API has no CSRF protection. Combined with no auth middleware, any website can make authenticated requests to the API.
**Fix:** Implement double-submit cookie pattern or `csurf` (Phase 13).

---

### TD-013: No Rate Limiting
**Description:** No rate limiting on any endpoint. Login endpoint is unlimited.
**Fix:** `express-rate-limit` on all routes, stricter limit on `/login` (Phase 13).

---

### TD-014: `switch_name` Denormalization
**Location:** `lib/db/src/schema/devices.ts`
**Description:** `switch_name` is stored as text on `devices` rather than as a FK to `switches.id`. Port moves won't correlate correctly. Renaming a switch breaks all device-to-switch associations.
**Fix:** Add `switch_id INTEGER` FK column, migrate data, keep `switch_name` as display cache (Phase 6 migration).

---

### TD-015: No Retry Logic Anywhere
**Description:** All DB operations, and all future external integration calls, have zero retry logic. A transient DB connection error crashes the request.
**Fix:** Wrap DB calls with exponential backoff; add circuit breaker for external integrations (Phase 2–5).

---

## MEDIUM — Fix before production deployment

### TD-016: No Job Queue
**Description:** Discovery jobs are run inline in HTTP request handlers. Long-running SNMP walks (potentially 30–120 seconds per switch) will time out the HTTP request.
**Fix:** Implement a persistent job queue (BullMQ + Redis, or pg-boss for PostgreSQL-native queue) (Phase 2).

### TD-017: `audit_logs.old_value` and `new_value` are TEXT
**Description:** Should be `JSONB` for structured diffing.
**Fix:** Migration to change column types (Phase 12).

### TD-018: No Docker Compose
**Description:** Application cannot be deployed outside of Replit.
**Fix:** Dockerfiles + docker-compose.yml (Phase 1).

### TD-019: No Security Headers
**Description:** No `Helmet.js`. No HSTS, CSP, X-Frame-Options, X-Content-Type-Options.
**Fix:** Add `helmet` middleware (Phase 13).

### TD-020: No Input Sanitization
**Description:** User-provided strings are inserted directly into DB via Drizzle without sanitization. Drizzle parameterizes queries so SQL injection is prevented, but XSS via stored strings is possible.
**Fix:** Sanitize text inputs server-side (Phase 13).

---

## LOW — Fix before v1.0

### TD-021: `noImplicitReturns: false` in tsconfig
**Description:** Disabled to avoid TS7030 on Express route handlers. Should fix handlers to use `{ res.json(); return; }` pattern instead.

### TD-022: SHA-256 Session Token in `auth.ts`
**Description:** The "token" returned by `/login` is `sha256(userId + username + Date.now())`. Not a signed JWT, not a session cookie. Not stored server-side. Stateless but not verifiable.

### TD-023: `src/seed.ts` in production artifact
**Description:** Seed file is co-located with production server code and in the Docker build context.

### TD-024: CORS is `cors()` with default wildcard
**Description:** `app.use(cors())` allows all origins. Should restrict to known frontend origins.

---

## Debt Summary

| Priority | Count | Blocking Production? |
|---|---|---|
| CRITICAL | 8 | Yes |
| HIGH | 7 | Yes (for external testing) |
| MEDIUM | 5 | Yes (for deployment) |
| LOW | 4 | No |
| **Total** | **24** | — |
