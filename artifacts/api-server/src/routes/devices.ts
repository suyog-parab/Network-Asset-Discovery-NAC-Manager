import { Router } from "express";
import { db, devicesTable, vlansTable, sitesTable, deviceHistoryTable, auditLogsTable, alertsTable } from "@workspace/db";
import { eq, and, ilike, sql, desc, inArray } from "drizzle-orm";
import {
  ListDevicesQueryParams,
  CreateDeviceBody,
  UpdateDeviceBody,
  ApproveDeviceBody,
  RejectDeviceBody,
  BulkApproveDevicesBody,
  BulkRejectDevicesBody,
  BulkAssignVlanBody,
} from "@workspace/api-zod";
import { syncDeviceToRadius, quarantineDeviceInRadius, removeDeviceFromRadius } from "../services/radius-sync";
import { logger } from "../lib/logger";
import { Pool } from "pg";

const router = Router();

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  }
  return _pool;
}

async function enrichDevice(device: typeof devicesTable.$inferSelect) {
  let vlan = null;
  let site = null;
  if (device.vlanId) {
    const [v] = await db.select().from(vlansTable).where(eq(vlansTable.id, device.vlanId));
    vlan = v ?? null;
  }
  if (device.siteId) {
    const [s] = await db.select().from(sitesTable).where(eq(sitesTable.id, device.siteId));
    site = s ?? null;
  }
  return { ...device, vlan, site };
}

async function logAudit(action: string, entityId: number | null, oldValue: string | null, newValue: string | null, username = "system") {
  await db.insert(auditLogsTable).values({
    username,
    action,
    entityType: "device",
    entityId,
    oldValue,
    newValue,
  });
}

router.get("/", async (req, res) => {
  const parsed = ListDevicesQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { status, vlanId, siteId, search, page = 1, limit = 50 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(devicesTable.status, status));
  if (vlanId) conditions.push(eq(devicesTable.vlanId, vlanId));
  if (siteId) conditions.push(eq(devicesTable.siteId, siteId));

  let query = db.select().from(devicesTable).$dynamic();
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(devicesTable).$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
    countQuery = countQuery.where(and(...conditions));
  }

  if (search) {
    const searchCond = sql`(${devicesTable.macAddress} ilike ${'%' + search + '%'} or ${devicesTable.ipAddress} ilike ${'%' + search + '%'} or ${devicesTable.hostname} ilike ${'%' + search + '%'} or ${devicesTable.vendor} ilike ${'%' + search + '%'})`;
    query = query.where(searchCond);
    countQuery = countQuery.where(searchCond);
  }

  const [devices, countResult] = await Promise.all([
    query.orderBy(desc(devicesTable.lastSeen)).limit(limit).offset(offset),
    countQuery,
  ]);

  const enriched = await Promise.all(devices.map(enrichDevice));

  res.json({
    data: enriched,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  });
});

router.post("/bulk-approve", async (req, res) => {
  const parsed = BulkApproveDevicesBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { ids } = parsed.data;
  let succeeded = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
      if (!device) { errors.push(`Device ${id} not found`); continue; }
      await db.update(devicesTable).set({ status: "APPROVED", approvedAt: new Date(), approvedBy: "system" }).where(eq(devicesTable.id, id));
      try {
        await syncDeviceToRadius(getPool(), device.macAddress, device.vlanId, "approve");
        await db.update(devicesTable).set({ radiusSynced: true, status: "SYNCED" }).where(eq(devicesTable.id, id));
      } catch (radiusErr) {
        logger.warn({ deviceId: id, err: radiusErr }, "RADIUS sync failed during bulk approve — device approved in DB but not in RADIUS");
      }
      await logAudit("bulk_approve", id, device.status, "APPROVED");
      succeeded++;
    } catch (e) {
      errors.push(`Failed for device ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  res.json({ succeeded, failed: ids.length - succeeded, errors });
});

router.post("/bulk-reject", async (req, res) => {
  const parsed = BulkRejectDevicesBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { ids } = parsed.data;
  let succeeded = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
      if (!device) { errors.push(`Device ${id} not found`); continue; }
      await db.update(devicesTable).set({ status: "REJECTED" }).where(eq(devicesTable.id, id));
      try {
        await removeDeviceFromRadius(device.macAddress);
        await db.update(devicesTable).set({ radiusSynced: false }).where(eq(devicesTable.id, id));
      } catch (radiusErr) {
        logger.warn({ deviceId: id, err: radiusErr }, "RADIUS removal failed during bulk reject");
      }
      await logAudit("bulk_reject", id, device.status, "REJECTED");
      succeeded++;
    } catch (e) {
      errors.push(`Failed for device ${id}`);
    }
  }
  res.json({ succeeded, failed: ids.length - succeeded, errors });
});

router.post("/bulk-vlan", async (req, res) => {
  const parsed = BulkAssignVlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { ids, vlanId } = parsed.data;
  await db.update(devicesTable).set({ vlanId }).where(sql`${devicesTable.id} = ANY(${ids})`);
  res.json({ updated: ids.length });
});

router.post("/", async (req, res) => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [device] = await db.insert(devicesTable).values(parsed.data).returning();
  res.status(201).json(device);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(await enrichDevice(device));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [device] = await db.update(devicesTable).set(parsed.data).where(eq(devicesTable.id, id)).returning();
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(await enrichDevice(device));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (device) {
    try { await removeDeviceFromRadius(device.macAddress); } catch (err) {
      logger.warn({ deviceId: id, err }, "RADIUS removal failed during device delete");
    }
  }
  await db.delete(devicesTable).where(eq(devicesTable.id, id));
  res.status(204).send();
});

router.post("/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = ApproveDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [existing] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Device not found" });

  const updateData: Record<string, unknown> = {
    status: "APPROVED",
    approvedAt: new Date(),
    approvedBy: "admin",
    updatedAt: new Date(),
  };
  if (parsed.data.vlanId) updateData.vlanId = parsed.data.vlanId;

  const [device] = await db.update(devicesTable).set(updateData).where(eq(devicesTable.id, id)).returning();

  let radiusSynced = false;
  let radiusError: string | null = null;
  try {
    await syncDeviceToRadius(getPool(), device.macAddress, device.vlanId, "approve");
    await db.update(devicesTable).set({ radiusSynced: true, status: "SYNCED" }).where(eq(devicesTable.id, id));
    radiusSynced = true;
    logger.info({ deviceId: id, mac: device.macAddress }, "Device approved and synced to RADIUS");
  } catch (err) {
    radiusError = err instanceof Error ? err.message : String(err);
    logger.warn({ deviceId: id, mac: device.macAddress, err }, "Device approved in DB, RADIUS sync failed");
  }

  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "approve",
    oldStatus: existing.status,
    newStatus: "APPROVED",
    performedBy: "admin",
    notes: radiusSynced ? "RADIUS sync successful" : `RADIUS sync failed: ${radiusError}`,
  });
  await logAudit("approve_device", id, existing.status, "APPROVED");

  const enriched = await enrichDevice(device);
  return res.json({ ...enriched, radiusSynced, radiusError });
});

router.post("/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = RejectDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [existing] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Device not found" });

  const [device] = await db.update(devicesTable).set({ status: "REJECTED", radiusSynced: false, updatedAt: new Date() }).where(eq(devicesTable.id, id)).returning();

  try {
    await removeDeviceFromRadius(existing.macAddress);
    logger.info({ deviceId: id, mac: existing.macAddress }, "Device rejected and removed from RADIUS");
  } catch (err) {
    logger.warn({ deviceId: id, mac: existing.macAddress, err }, "Device rejected in DB, RADIUS removal failed");
  }

  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "reject",
    oldStatus: existing.status,
    newStatus: "REJECTED",
    performedBy: "admin",
    notes: parsed.data.reason ?? null,
  });
  await logAudit("reject_device", id, existing.status, "REJECTED");
  return res.json(await enrichDevice(device));
});

router.post("/:id/quarantine", async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Device not found" });

  const [device] = await db.update(devicesTable).set({ status: "QUARANTINED", radiusSynced: false, updatedAt: new Date() }).where(eq(devicesTable.id, id)).returning();

  let quarantineError: string | null = null;
  try {
    await quarantineDeviceInRadius(existing.macAddress);
    await db.update(devicesTable).set({ radiusSynced: true }).where(eq(devicesTable.id, id));
    logger.info({ deviceId: id, mac: existing.macAddress }, "Device quarantined in RADIUS (VLAN 999)");
  } catch (err) {
    quarantineError = err instanceof Error ? err.message : String(err);
    logger.warn({ deviceId: id, mac: existing.macAddress, err }, "Device quarantined in DB, RADIUS quarantine failed");
  }

  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "quarantine",
    oldStatus: existing.status,
    newStatus: "QUARANTINED",
    performedBy: "admin",
    notes: quarantineError ? `RADIUS quarantine failed: ${quarantineError}` : "RADIUS quarantine set to VLAN 999",
  });
  await logAudit("quarantine_device", id, existing.status, "QUARANTINED");

  const enriched = await enrichDevice(device);
  return res.json({ ...enriched, quarantineError });
});

router.get("/:id/history", async (req, res) => {
  const id = parseInt(req.params.id);
  const history = await db
    .select()
    .from(deviceHistoryTable)
    .where(eq(deviceHistoryTable.deviceId, id))
    .orderBy(desc(deviceHistoryTable.createdAt));
  res.json(history);
});

export default router;
