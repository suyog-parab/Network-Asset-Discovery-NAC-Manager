import { Router } from "express";
import { db, radiusClientsTable, radiusGroupsTable, vlansTable, devicesTable, nacPoliciesTable, auditLogsTable } from "@workspace/db";
import { eq, sql, and, asc } from "drizzle-orm";
import {
  CreateRadiusClientBody,
  UpdateRadiusClientBody,
  CreateRadiusGroupBody,
  UpdateRadiusGroupBody,
  SyncToRadiusBody,
} from "@workspace/api-zod";
import { syncAllApprovedDevices } from "../services/radius-sync";
import { logger } from "../lib/logger";

const router = Router();

/* ─── RADIUS Clients ──────────────────────────────────────────────────────── */

router.get("/clients", async (req, res) => {
  const clients = await db.select().from(radiusClientsTable).orderBy(radiusClientsTable.name);
  res.json(clients);
});

router.post("/clients", async (req, res) => {
  const parsed = CreateRadiusClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [client] = await db.insert(radiusClientsTable).values(parsed.data).returning();
  res.status(201).json(client);
});

router.put("/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateRadiusClientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [client] = await db.update(radiusClientsTable).set(parsed.data).where(eq(radiusClientsTable.id, id)).returning();
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

router.delete("/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(radiusClientsTable).where(eq(radiusClientsTable.id, id));
  res.status(204).send();
});

/* ─── RADIUS Groups ───────────────────────────────────────────────────────── */

router.get("/groups", async (req, res) => {
  const groups = await db.select().from(radiusGroupsTable).orderBy(radiusGroupsTable.name);
  const enriched = await Promise.all(
    groups.map(async (g) => {
      let vlan = null;
      if (g.vlanId) {
        const [v] = await db.select().from(vlansTable).where(eq(vlansTable.id, g.vlanId));
        vlan = v ?? null;
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(devicesTable)
        .where(eq(devicesTable.vlanId, g.vlanId ?? -1));
      return { ...g, vlan, deviceCount: Number(count) };
    })
  );
  res.json(enriched);
});

router.post("/groups", async (req, res) => {
  const parsed = CreateRadiusGroupBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [group] = await db.insert(radiusGroupsTable).values(parsed.data).returning();
  res.status(201).json({ ...group, vlan: null, deviceCount: 0 });
});

router.put("/groups/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateRadiusGroupBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [group] = await db.update(radiusGroupsTable).set(parsed.data).where(eq(radiusGroupsTable.id, id)).returning();
  if (!group) return res.status(404).json({ error: "Group not found" });
  res.json({ ...group, vlan: null, deviceCount: 0 });
});

router.delete("/groups/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(radiusGroupsTable).where(eq(radiusGroupsTable.id, id));
  res.status(204).send();
});

/* ─── Sync ────────────────────────────────────────────────────────────────── */

router.post("/sync", async (req, res) => {
  const parsed = SyncToRadiusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const deviceIds = parsed.data.deviceIds;
  try {
    const result = await syncAllApprovedDevices(deviceIds && deviceIds.length > 0 ? deviceIds : undefined);
    logger.info(result, "RADIUS sync completed via API");
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "RADIUS sync failed");
    res.status(500).json({ error: `RADIUS sync failed: ${message}` });
  }
});

router.get("/sync-status", async (req, res) => {
  const [{ count: syncedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(devicesTable)
    .where(eq(devicesTable.radiusSynced, true));
  const [{ count: pendingCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(devicesTable)
    .where(and(eq(devicesTable.status, "APPROVED"), eq(devicesTable.radiusSynced, false)));

  const [lastSynced] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.radiusSynced, true))
    .orderBy(sql`updated_at desc`)
    .limit(1);

  res.json({
    lastSyncAt: lastSynced?.updatedAt ?? null,
    syncedCount: Number(syncedCount),
    pendingSyncCount: Number(pendingCount),
  });
});

/* ─── Phase 8: MAB Policy Engine (called by FreeRADIUS rlm_rest) ─────────── */

router.post("/authorize", async (req, res) => {
  const callingStation: string = req.body?.["Calling-Station-Id"] ?? req.body?.callingStationId ?? "";
  if (!callingStation) {
    return res.status(400).json({ error: "Calling-Station-Id is required" });
  }

  const normalizedMac = callingStation.toLowerCase().replace(/[^0-9a-f]/g, "").replace(/(.{2})/g, "$1:").slice(0, 17);
  logger.info({ mac: normalizedMac }, "RADIUS authorize request");

  const [device] = await db
    .select()
    .from(devicesTable)
    .where(sql`lower(replace(replace(replace(${devicesTable.macAddress}, ':', ''), '-', ''), '.', '')) = ${normalizedMac.replace(/:/g, "")}`)
    .limit(1);

  if (!device) {
    await db.insert(auditLogsTable).values({
      username: "radius",
      action: "radius_auth_unknown",
      entityType: "device",
      entityId: null,
      oldValue: null,
      newValue: normalizedMac,
    });

    return res.json({
      "Reply-Message": "Device unknown — pending discovery",
      "Tunnel-Type": "VLAN",
      "Tunnel-Medium-Type": "IEEE-802",
      "Tunnel-Private-Group-ID": process.env["GUEST_VLAN_ID"] ?? "99",
      result: "accept",
      action: "guest_vlan",
    });
  }

  const policies = await db
    .select()
    .from(nacPoliciesTable)
    .where(eq(nacPoliciesTable.enabled, true))
    .orderBy(asc(nacPoliciesTable.priority));

  let matchedAction = device.status === "APPROVED" || device.status === "SYNCED" ? "allow_access" : "deny_access";
  let matchedVlanId: number | null = device.vlanId;

  for (const policy of policies) {
    const cond = policy.condition?.toLowerCase() ?? "";
    const deviceStatus = device.status.toLowerCase();
    const deviceVendor = (device.vendor ?? "").toLowerCase();
    const deviceOs = (device.operatingSystem ?? "").toLowerCase();

    const matches =
      cond.includes(`status=${deviceStatus}`) ||
      cond.includes(`vendor=${deviceVendor}`) ||
      cond.includes(`os=${deviceOs}`) ||
      cond === "*" ||
      cond === "any";

    if (matches) {
      matchedAction = policy.action;
      matchedVlanId = policy.vlanId ?? matchedVlanId;
      break;
    }
  }

  await db.insert(auditLogsTable).values({
    username: "radius",
    action: `radius_auth_${matchedAction}`,
    entityType: "device",
    entityId: device.id,
    oldValue: device.status,
    newValue: matchedAction,
  });

  if (matchedAction === "deny_access") {
    return res.json({ result: "reject", "Reply-Message": "Access denied by NAC policy" });
  }

  if (matchedAction === "quarantine") {
    const quarantineVlan = parseInt(process.env["QUARANTINE_VLAN_ID"] ?? "999", 10);
    return res.json({
      result: "accept",
      action: "quarantine",
      "Tunnel-Type": "VLAN",
      "Tunnel-Medium-Type": "IEEE-802",
      "Tunnel-Private-Group-ID": String(quarantineVlan),
    });
  }

  const response: Record<string, string | number> = { result: "accept", action: matchedAction };

  if (matchedVlanId) {
    const [vlan] = await db.select().from(vlansTable).where(eq(vlansTable.id, matchedVlanId));
    if (vlan) {
      response["Tunnel-Type"] = "VLAN";
      response["Tunnel-Medium-Type"] = "IEEE-802";
      response["Tunnel-Private-Group-ID"] = vlan.vlanId;
    }
  }

  return res.json(response);
});

router.post("/accounting", async (req, res) => {
  const acctStatusType: string = req.body?.["Acct-Status-Type"] ?? req.body?.acctStatusType ?? "Interim-Update";
  const callingStation: string = req.body?.["Calling-Station-Id"] ?? req.body?.callingStationId ?? "";
  const nasIp: string = req.body?.["NAS-IP-Address"] ?? req.body?.nasIpAddress ?? "";
  const framedIp: string = req.body?.["Framed-IP-Address"] ?? req.body?.framedIpAddress ?? "";

  logger.info({ acctStatusType, mac: callingStation, nasIp }, "RADIUS accounting event");

  if (callingStation && (acctStatusType === "Start" || acctStatusType === "Interim-Update")) {
    const normalizedMac = callingStation.toLowerCase().replace(/[^0-9a-f]/g, "").replace(/(.{2})/g, "$1:").slice(0, 17);

    if (framedIp && framedIp !== "0.0.0.0") {
      await db
        .update(devicesTable)
        .set({ ipAddress: framedIp, lastSeen: new Date(), updatedAt: new Date() })
        .where(sql`lower(replace(replace(replace(${devicesTable.macAddress}, ':', ''), '-', ''), '.', '')) = ${normalizedMac.replace(/:/g, "")}`)
        .catch((err) => logger.warn({ err }, "Accounting IP update failed"));
    }
  }

  return res.json({ result: "ok" });
});

export default router;
