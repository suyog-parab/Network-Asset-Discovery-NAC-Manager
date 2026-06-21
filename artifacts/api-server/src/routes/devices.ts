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

const router = Router();

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
      await db.update(devicesTable).set({ status: "APPROVED", approvedAt: new Date(), approvedBy: "admin" }).where(eq(devicesTable.id, id));
      await logAudit("bulk_approve", id, device.status, "APPROVED");
      succeeded++;
    } catch (e) {
      errors.push(`Failed for device ${id}`);
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
  let succeeded = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await db.update(devicesTable).set({ vlanId }).where(eq(devicesTable.id, id));
      await logAudit("bulk_vlan_assign", id, null, String(vlanId));
      succeeded++;
    } catch (e) {
      errors.push(`Failed for device ${id}`);
    }
  }
  res.json({ succeeded, failed: ids.length - succeeded, errors });
});

router.post("/", async (req, res) => {
  const parsed = CreateDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [device] = await db.insert(devicesTable).values({ ...parsed.data, status: "PENDING" }).returning();
  await logAudit("create_device", device.id, null, device.macAddress);
  res.status(201).json(await enrichDevice(device));
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
  const [device] = await db.update(devicesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(devicesTable.id, id)).returning();
  if (!device) return res.status(404).json({ error: "Device not found" });
  await logAudit("update_device", id, null, JSON.stringify(parsed.data));
  res.json(await enrichDevice(device));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(devicesTable).where(eq(devicesTable.id, id));
  await logAudit("delete_device", id, null, null);
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
  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "approve",
    oldStatus: existing.status,
    newStatus: "APPROVED",
    performedBy: "admin",
  });
  await logAudit("approve_device", id, existing.status, "APPROVED");
  res.json(await enrichDevice(device));
});

router.post("/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = RejectDeviceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [existing] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Device not found" });

  const [device] = await db.update(devicesTable).set({ status: "REJECTED", updatedAt: new Date() }).where(eq(devicesTable.id, id)).returning();
  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "reject",
    oldStatus: existing.status,
    newStatus: "REJECTED",
    performedBy: "admin",
    notes: parsed.data.reason ?? null,
  });
  await logAudit("reject_device", id, existing.status, "REJECTED");
  res.json(await enrichDevice(device));
});

router.post("/:id/quarantine", async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(devicesTable).where(eq(devicesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Device not found" });

  const [device] = await db.update(devicesTable).set({ status: "QUARANTINED", updatedAt: new Date() }).where(eq(devicesTable.id, id)).returning();
  await db.insert(deviceHistoryTable).values({
    deviceId: id,
    action: "quarantine",
    oldStatus: existing.status,
    newStatus: "QUARANTINED",
    performedBy: "admin",
  });
  await logAudit("quarantine_device", id, existing.status, "QUARANTINED");
  res.json(await enrichDevice(device));
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
