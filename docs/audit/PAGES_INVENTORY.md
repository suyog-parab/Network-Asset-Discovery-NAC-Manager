# Pages Inventory — NAC Manager v0.1

Generated: 2026-06-21 | Framework: React 19 + Vite + Wouter + shadcn/ui

---

## Router Configuration

File: `artifacts/nac-manager/src/App.tsx`
Router: `wouter` (hash or path routing)
Layout: `MainLayout.tsx` wraps all authenticated pages with persistent sidebar

---

## Page Inventory

### 1. Dashboard — `/`

File: `src/pages/dashboard.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Stats cards (total, pending, quarantined, alerts) | `useGetDashboardStats` | ✅ Real DB |
| Bar chart: Devices by VLAN | `useGetDevicesByVlan` | ✅ Real DB |
| Donut chart: Devices by Site | `useGetDevicesBySite` | ✅ Real DB |
| Bar chart: Devices by Department | `useGetDevicesByDepartment` | ✅ Real DB |
| Recent activity feed | `useGetRecentActivity` | ✅ Real audit_logs |

**Status:** Functional. Data reflects what is seeded.

---

### 2. Device Inventory — `/devices`

File: `src/pages/devices.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Paginated device table | `useListDevices(params)` | ✅ Real DB |
| Status filter dropdown | Query param | ✅ |
| Search (MAC/IP/hostname) | Query param | ✅ |
| Approve row action | `useApproveDevice` | ⚠️ DB only, no RADIUS |
| Reject row action | `useRejectDevice` | ⚠️ DB only |
| Quarantine row action | `useQuarantineDevice` | ❌ DB only, no CoA |
| Bulk select + approve | `useBulkApproveDevices` | ⚠️ DB only |
| Bulk select + reject | `useBulkRejectDevices` | ⚠️ DB only |
| Bulk VLAN assign | `useBulkAssignVlan` | ⚠️ DB only, no switch |

**Status:** UI functional. Actions do not trigger real enforcement.

---

### 3. Device Detail — `/devices/:id`

File: `src/pages/device-detail.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Full device info card | `useGetDevice(id)` | ✅ Real DB |
| History timeline | `useGetDeviceHistory(id)` | ✅ Real DB |
| Approve / Reject / Quarantine dialogs | `useApproveDevice` etc. | ⚠️ DB only |

**Status:** Functional. No real enforcement behind actions.

---

### 4. Quarantine — `/quarantine`

File: `src/pages/quarantine.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Quarantined device table | `useListDevices({status:"QUARANTINED"})` | ✅ Real DB |
| Approve-from-quarantine | `useApproveDevice` | ⚠️ DB only, no CoA |
| Reject action | `useRejectDevice` | ⚠️ DB only |

**Status:** UI functional. VLAN enforcement not real.

---

### 5. Discovery — `/discovery`

File: `src/pages/discovery.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Jobs tab: discovery job table | `useListDiscoveryJobs` | ✅ Reads DB |
| Sources tab: source list | `useListDiscoverySources` | ✅ Reads DB |
| Trigger new job button | `useCreateDiscoveryJob` | ❌ SIMULATED (random) |
| Add source form | `useCreateDiscoverySource` | ✅ Saves to DB |
| Edit/delete source | `useUpdateDiscoverySource` / `useDeleteDiscoverySource` | ✅ DB |

**Status:** Source CRUD is real. Job execution is fully simulated.

---

### 6. VLANs — `/vlans`

File: `src/pages/vlans.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| VLAN table with device count | `useListVlans` | ✅ Real DB |
| Add VLAN form | `useCreateVlan` | ✅ Real DB |
| Edit VLAN | `useUpdateVlan` | ✅ Real DB |
| Delete VLAN | `useDeleteVlan` | ✅ Real DB |

**Status:** Fully functional CRUD.

---

### 7. Switches — `/switches`

File: `src/pages/switches.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Switch table | `useListSwitches` | ✅ Real DB |
| Add/edit switch form | `useCreateSwitch` / `useUpdateSwitch` | ✅ Real DB |
| Delete | `useDeleteSwitch` | ✅ Real DB |

**Status:** CRUD functional. No SNMP test or live status polling.

---

### 8. Sites — `/sites`

File: `src/pages/sites.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Site hierarchy table | `useListSites` | ✅ Real DB |
| Add/edit/delete | `useCreateSite` etc. | ✅ Real DB |

**Status:** Fully functional CRUD.

---

### 9. FreeRADIUS — `/radius`

File: `src/pages/radius.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Clients tab | `useListRadiusClients` | ✅ Real DB |
| Groups tab | `useListRadiusGroups` | ✅ Real DB |
| Sync button | `useSyncToRadius` | ❌ Sets DB flag only |
| Sync status | `useGetRadiusSyncStatus` | ⚠️ Reads DB flag |

**Status:** CRUD functional. Sync does not touch FreeRADIUS at all.

---

### 10. NAC Policies — `/policies`

File: `src/pages/policies.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Policy table | `useListPolicies` | ✅ Real DB |
| Add/edit policy form | `useCreatePolicy` / `useUpdatePolicy` | ✅ Real DB |
| Enable/disable toggle | `useUpdatePolicy` | ✅ Real DB |
| Delete | `useDeletePolicy` | ✅ Real DB |

**Status:** CRUD functional. Policies are NEVER evaluated.

---

### 11. Alerts — `/alerts`

File: `src/pages/alerts.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Alert table | `useListAlerts(params)` | ✅ Real DB |
| Severity/status filters | Query params | ✅ |
| Acknowledge button | `useAcknowledgeAlert` | ✅ Real DB |
| Resolve button | `useResolveAlert` | ✅ Real DB |

**Status:** Functional. Alerts are only from seed data; no auto-generation.

---

### 12. Cisco Config Generator — `/cisco`

File: `src/pages/cisco.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Config form | `useGenerateCiscoConfig` | ✅ Template generation |
| CLI output code block | — | ✅ Real IOS template |
| Copy button | — | ✅ Browser clipboard |

**Status:** Fully functional. Generates real IOS CLI. No switch SSH.

---

### 13. Reports — `/reports`

File: `src/pages/reports.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Inventory charts | `useGetInventoryReport` | ✅ Real DB aggregations |
| Compliance gauge | `useGetComplianceReport` | ✅ Real DB |

**Status:** Functional against real DB data.

---

### 14. Audit Log — `/audit`

File: `src/pages/audit.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| Paginated log table | `useListAuditLogs(params)` | ✅ Real DB |

**Status:** Functional.

---

### 15. User Management — `/users`

File: `src/pages/users.tsx`

| Element | Hook | Real Data? |
|---|---|---|
| User table with role badges | `useListUsers` | ✅ Real DB |
| Add user form | `useCreateUser` | ⚠️ SHA-256 hash |
| Edit user | `useUpdateUser` | ✅ Real DB |
| Delete | `useDeleteUser` | ✅ Real DB |

**Status:** Functional. Password hashing is insecure.

---

### 16. Settings — `/settings`

File: `src/pages/settings.tsx`

**Status:** Placeholder page. No functionality.

---

## Layout

File: `src/components/layout/MainLayout.tsx`

- Persistent left sidebar with all navigation links
- No authentication guard (all pages accessible without login)
- No role-based menu filtering

---

## Missing Pages

| Page | Purpose | Phase |
|---|---|---|
| `/login` | Login form | Phase 13 |
| `/discovery/sources/:id/logs` | Per-source integration logs | Phase 12 |
| `/radius/logs` | FreeRADIUS auth logs | Phase 7 |
| `/health` | System health dashboard | Phase 11 |
