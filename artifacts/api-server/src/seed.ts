import { db } from "@workspace/db";
import {
  sitesTable,
  vlansTable,
  switchesTable,
  devicesTable,
  discoverySourcesTable,
  discoveryJobsTable,
  radiusClientsTable,
  radiusGroupsTable,
  nacPoliciesTable,
  alertsTable,
  auditLogsTable,
  usersTable,
  deviceHistoryTable,
} from "@workspace/db";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "nac-salt").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Users
  const existingUsers = await db.select().from(usersTable);
  if (existingUsers.length === 0) {
    await db.insert(usersTable).values([
      { username: "admin", email: "admin@corp.local", passwordHash: hashPassword("admin123"), role: "super_admin", fullName: "System Administrator", active: true },
      { username: "netadmin", email: "netadmin@corp.local", passwordHash: hashPassword("netadmin123"), role: "network_admin", fullName: "Network Admin", active: true },
      { username: "helpdesk1", email: "helpdesk@corp.local", passwordHash: hashPassword("help123"), role: "helpdesk", fullName: "Help Desk Technician", active: true },
      { username: "auditor", email: "auditor@corp.local", passwordHash: hashPassword("audit123"), role: "auditor", fullName: "Security Auditor", active: true },
    ]);
  }

  // Sites
  const existingSites = await db.select().from(sitesTable);
  let siteIds: number[] = [];
  if (existingSites.length === 0) {
    const sites = await db.insert(sitesTable).values([
      { name: "HQ - New York", code: "NY-HQ", address: "1 Corporate Plaza", city: "New York", country: "US", type: "site" },
      { name: "DC - Newark", code: "NJ-DC", address: "500 Data Center Dr", city: "Newark", country: "US", type: "site" },
      { name: "Branch - Chicago", code: "IL-BR", address: "200 N Michigan Ave", city: "Chicago", country: "US", type: "branch" },
    ]).returning();
    siteIds = sites.map((s) => s.id);
  } else {
    siteIds = existingSites.map((s) => s.id);
  }

  // VLANs
  const existingVlans = await db.select().from(vlansTable);
  let vlanIds: number[] = [];
  if (existingVlans.length === 0) {
    const vlans = await db.insert(vlansTable).values([
      { vlanId: 10, name: "CORP-USERS", description: "Corporate user workstations", type: "production", isQuarantine: false },
      { vlanId: 20, name: "CORP-SERVERS", description: "Production servers", type: "production", isQuarantine: false },
      { vlanId: 30, name: "PRINTERS", description: "Printers and MFPs", type: "production", isQuarantine: false },
      { vlanId: 40, name: "VOIP", description: "Voice over IP phones", type: "production", isQuarantine: false },
      { vlanId: 100, name: "GUEST", description: "Guest wireless network", type: "guest", isQuarantine: false },
      { vlanId: 999, name: "QUARANTINE", description: "Quarantine - restricted access", type: "quarantine", isQuarantine: true },
    ]).returning();
    vlanIds = vlans.map((v) => v.id);
  } else {
    vlanIds = existingVlans.map((v) => v.id);
  }

  // Switches
  const existingSwitches = await db.select().from(switchesTable);
  if (existingSwitches.length === 0) {
    await db.insert(switchesTable).values([
      { name: "SW-HQ-CORE-01", ipAddress: "10.0.0.1", model: "Cisco Catalyst 9300", location: "Server Room A", siteId: siteIds[0], snmpVersion: "v2c", snmpCommunity: "public", status: "online", lastPolled: new Date() },
      { name: "SW-HQ-ACCESS-01", ipAddress: "10.0.1.1", model: "Cisco Catalyst 2960X", location: "Floor 2 IDF", siteId: siteIds[0], snmpVersion: "v2c", snmpCommunity: "public", status: "online", lastPolled: new Date() },
      { name: "SW-DC-CORE-01", ipAddress: "10.1.0.1", model: "Cisco Nexus 9000", location: "DC Main Row", siteId: siteIds[1], snmpVersion: "v3", status: "online", lastPolled: new Date() },
      { name: "SW-CHI-ACCESS-01", ipAddress: "10.2.1.1", model: "Cisco Catalyst 2960S", location: "Chicago Branch MDF", siteId: siteIds[2], snmpVersion: "v2c", snmpCommunity: "public", status: "unknown" },
    ]);
  }

  // Devices
  const existingDevices = await db.select().from(devicesTable);
  let deviceIds: number[] = [];
  if (existingDevices.length === 0) {
    const devices = await db.insert(devicesTable).values([
      { macAddress: "AA:BB:CC:01:02:03", ipAddress: "10.0.1.100", hostname: "WKSTN-NYC-001", username: "jsmith", vendor: "Dell", operatingSystem: "Windows 11", department: "Engineering", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/1", vlanId: vlanIds[0], siteId: siteIds[0], status: "APPROVED", approvedBy: "admin", approvedAt: new Date(), radiusSynced: true },
      { macAddress: "AA:BB:CC:01:02:04", ipAddress: "10.0.1.101", hostname: "WKSTN-NYC-002", username: "mjones", vendor: "HP", operatingSystem: "Windows 11", department: "Finance", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/2", vlanId: vlanIds[0], siteId: siteIds[0], status: "APPROVED", approvedBy: "admin", approvedAt: new Date(), radiusSynced: true },
      { macAddress: "AA:BB:CC:01:02:05", ipAddress: "10.0.1.102", hostname: "LAPTOP-NYC-005", username: "abrown", vendor: "Apple", operatingSystem: "macOS 14", department: "Marketing", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/3", vlanId: vlanIds[0], siteId: siteIds[0], status: "APPROVED", approvedBy: "netadmin", approvedAt: new Date(), radiusSynced: false },
      { macAddress: "DD:EE:FF:01:02:03", ipAddress: "10.0.2.50", hostname: "SRV-WEB-01", vendor: "Dell", operatingSystem: "Ubuntu 22.04 LTS", department: "IT", switchName: "SW-HQ-CORE-01", switchPort: "Gi1/0/1", vlanId: vlanIds[1], siteId: siteIds[0], status: "APPROVED", approvedBy: "admin", approvedAt: new Date(), radiusSynced: true },
      { macAddress: "11:22:33:44:55:66", ipAddress: "10.0.1.200", vendor: "Zebra Technologies", operatingSystem: "Android 12", department: "Warehouse", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/10", siteId: siteIds[0], status: "PENDING" },
      { macAddress: "AA:11:BB:22:CC:33", ipAddress: "10.0.1.201", vendor: "Unknown", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/11", siteId: siteIds[0], status: "PENDING" },
      { macAddress: "FF:EE:DD:CC:BB:AA", ipAddress: "10.0.1.210", hostname: "rogue-device", vendor: "Raspberry Pi Foundation", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/20", siteId: siteIds[0], status: "QUARANTINED", vlanId: vlanIds[5] },
      { macAddress: "DE:AD:BE:EF:01:01", ipAddress: "10.0.1.220", vendor: "Cisco", operatingSystem: "Cisco IOS", department: "IT", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/22", siteId: siteIds[0], status: "REJECTED" },
      { macAddress: "00:11:22:33:44:55", ipAddress: "10.2.1.50", hostname: "CHI-LAPTOP-001", username: "dwilson", vendor: "Lenovo", operatingSystem: "Windows 10", department: "Sales", switchName: "SW-CHI-ACCESS-01", switchPort: "Gi0/1", vlanId: vlanIds[0], siteId: siteIds[2], status: "APPROVED", approvedBy: "netadmin", approvedAt: new Date(), radiusSynced: false },
      { macAddress: "00:1A:2B:3C:4D:5E", ipAddress: "10.0.1.240", vendor: "Polycom", operatingSystem: "Polycom OS", department: "Executive", switchName: "SW-HQ-ACCESS-01", switchPort: "Gi0/24", vlanId: vlanIds[3], siteId: siteIds[0], status: "APPROVED", approvedBy: "admin", approvedAt: new Date(), radiusSynced: true },
    ]).returning();
    deviceIds = devices.map((d) => d.id);
  } else {
    deviceIds = existingDevices.map((d) => d.id);
  }

  // Device History
  const existingHistory = await db.select().from(deviceHistoryTable);
  if (existingHistory.length === 0 && deviceIds.length > 0) {
    await db.insert(deviceHistoryTable).values([
      { deviceId: deviceIds[0], action: "discovered", oldStatus: null, newStatus: "DISCOVERED", performedBy: "system", notes: "First seen via SNMP poll" },
      { deviceId: deviceIds[0], action: "approve", oldStatus: "DISCOVERED", newStatus: "APPROVED", performedBy: "admin" },
      { deviceId: deviceIds[6], action: "quarantine", oldStatus: "APPROVED", newStatus: "QUARANTINED", performedBy: "netadmin", notes: "Suspicious traffic detected" },
    ]);
  }

  // Discovery Sources
  const existingSources = await db.select().from(discoverySourcesTable);
  let sourceIds: number[] = [];
  if (existingSources.length === 0) {
    const sources = await db.insert(discoverySourcesTable).values([
      { name: "HQ SNMP v2c", type: "snmp", host: "10.0.0.1", community: "public", enabled: true, lastRunAt: new Date(), lastRunStatus: "success" },
      { name: "Corp DHCP Server", type: "dhcp_windows", host: "10.0.0.10", username: "dhcp-reader", enabled: true, lastRunAt: new Date(), lastRunStatus: "success" },
      { name: "Active Directory", type: "active_directory", host: "10.0.0.5", username: "svc-nac", enabled: true, lastRunAt: new Date(), lastRunStatus: "success" },
    ]).returning();
    sourceIds = sources.map((s) => s.id);
  } else {
    sourceIds = existingSources.map((s) => s.id);
  }

  // Discovery Jobs
  const existingJobs = await db.select().from(discoveryJobsTable);
  if (existingJobs.length === 0) {
    await db.insert(discoveryJobsTable).values([
      { type: "snmp", status: "completed", sourceId: sourceIds[0], sourceName: "HQ SNMP v2c", devicesFound: 47, devicesNew: 3, devicesUpdated: 44, startedAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 3550000) },
      { type: "dhcp_windows", status: "completed", sourceId: sourceIds[1], sourceName: "Corp DHCP Server", devicesFound: 82, devicesNew: 1, devicesUpdated: 81, startedAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 7100000) },
      { type: "active_directory", status: "completed", sourceId: sourceIds[2], sourceName: "Active Directory", devicesFound: 63, devicesNew: 0, devicesUpdated: 63, startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86350000) },
      { type: "snmp", status: "failed", sourceId: sourceIds[0], sourceName: "HQ SNMP v2c", devicesFound: 0, devicesNew: 0, devicesUpdated: 0, errorMessage: "SNMP timeout after 5 retries", startedAt: new Date(Date.now() - 172800000) },
    ]);
  }

  // RADIUS Clients
  const existingRadiusClients = await db.select().from(radiusClientsTable);
  if (existingRadiusClients.length === 0) {
    await db.insert(radiusClientsTable).values([
      { name: "SW-HQ-CORE-01", ipAddress: "10.0.0.1", secret: "radius-secret-2024", nasType: "cisco", description: "HQ Core Switch" },
      { name: "SW-HQ-ACCESS-01", ipAddress: "10.0.1.1", secret: "radius-secret-2024", nasType: "cisco", description: "HQ Access Switch Floor 2" },
      { name: "WLC-HQ-01", ipAddress: "10.0.0.20", secret: "wlc-radius-secret", nasType: "cisco-wlc", description: "Wireless LAN Controller" },
    ]);
  }

  // RADIUS Groups
  const existingRadiusGroups = await db.select().from(radiusGroupsTable);
  if (existingRadiusGroups.length === 0) {
    await db.insert(radiusGroupsTable).values([
      { name: "corp-users", vlanId: vlanIds[0], attribute: "Tunnel-Private-Group-ID", value: "10", description: "Corporate user workstations" },
      { name: "corp-servers", vlanId: vlanIds[1], attribute: "Tunnel-Private-Group-ID", value: "20", description: "Production server VLAN" },
      { name: "guest-access", vlanId: vlanIds[4], attribute: "Tunnel-Private-Group-ID", value: "100", description: "Guest network access" },
      { name: "quarantine", vlanId: vlanIds[5], attribute: "Tunnel-Private-Group-ID", value: "999", description: "Quarantine VLAN" },
    ]);
  }

  // NAC Policies
  const existingPolicies = await db.select().from(nacPoliciesTable);
  if (existingPolicies.length === 0) {
    await db.insert(nacPoliciesTable).values([
      { name: "Auto-approve Known Vendor Devices", condition: "known_device", action: "approve", priority: 1, enabled: true, description: "Automatically approve devices from known corporate vendors" },
      { name: "Quarantine Unknown Devices", condition: "unknown_device", action: "quarantine", priority: 5, vlanId: vlanIds[5], enabled: true, description: "Quarantine any unknown device immediately" },
      { name: "Deny Rejected Devices", condition: "rejected_device", action: "deny_access", priority: 2, enabled: true, description: "Block access to all previously rejected devices" },
      { name: "Alert on Duplicate MAC", condition: "duplicate_mac", action: "alert", priority: 3, enabled: true, description: "Alert when the same MAC is seen on multiple ports" },
      { name: "Quarantine on Port Change", condition: "port_change", action: "quarantine", priority: 4, vlanId: vlanIds[5], enabled: false, description: "Quarantine device if moved to unexpected port" },
    ]);
  }

  // Alerts
  const existingAlerts = await db.select().from(alertsTable);
  if (existingAlerts.length === 0) {
    await db.insert(alertsTable).values([
      { type: "rogue_device", severity: "critical", status: "open", message: "Rogue device detected on SW-HQ-ACCESS-01 port Gi0/20", deviceId: deviceIds[6] ?? null },
      { type: "pending_approval", severity: "warning", status: "open", message: "2 devices pending approval for more than 24 hours", deviceId: null },
      { type: "radius_sync_failed", severity: "warning", status: "acknowledged", message: "FreeRADIUS sync failed: connection timeout", acknowledgedBy: "netadmin" },
      { type: "snmp_unreachable", severity: "warning", status: "open", message: "Switch SW-CHI-ACCESS-01 is unreachable via SNMP" },
      { type: "compliance_drop", severity: "info", status: "open", message: "Compliance rate dropped below 85% in the last 24 hours" },
      { type: "discovery_complete", severity: "info", status: "resolved", message: "Scheduled discovery completed: 47 devices scanned", resolvedAt: new Date() },
    ]);
  }

  // Audit Logs
  const existingAudit = await db.select().from(auditLogsTable);
  if (existingAudit.length === 0 && deviceIds.length > 0) {
    await db.insert(auditLogsTable).values([
      { username: "admin", action: "approve_device", entityType: "device", entityId: deviceIds[0], oldValue: "PENDING", newValue: "APPROVED", ipAddress: "10.0.1.50" },
      { username: "netadmin", action: "quarantine_device", entityType: "device", entityId: deviceIds[6] ?? null, oldValue: "APPROVED", newValue: "QUARANTINED", ipAddress: "10.0.1.51" },
      { username: "admin", action: "sync_radius", entityType: "radius", entityId: null, oldValue: null, newValue: "synced 8 devices", ipAddress: "10.0.1.50" },
      { username: "admin", action: "create_user", entityType: "user", entityId: null, oldValue: null, newValue: "helpdesk1", ipAddress: "10.0.1.50" },
      { username: "netadmin", action: "create_vlan", entityType: "vlan", entityId: vlanIds[5], oldValue: null, newValue: "QUARANTINE (999)", ipAddress: "10.0.1.51" },
    ]);
  }

  console.log("Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
