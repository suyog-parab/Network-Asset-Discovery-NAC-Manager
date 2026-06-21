import { Router } from "express";
import { db } from "@workspace/db";
import {
  devicesTable,
  alertsTable,
  auditLogsTable,
  vlansTable,
  sitesTable,
} from "@workspace/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalResult,
    approvedResult,
    pendingResult,
    rejectedResult,
    quarantinedResult,
    newTodayResult,
    syncedResult,
    openAlertsResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(devicesTable),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "APPROVED")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "PENDING")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "REJECTED")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "QUARANTINED")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(gte(devicesTable.firstSeen, today)),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.radiusSynced, true)),
    db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.status, "open")),
  ]);

  res.json({
    totalDevices: Number(totalResult[0]?.count ?? 0),
    approvedDevices: Number(approvedResult[0]?.count ?? 0),
    pendingDevices: Number(pendingResult[0]?.count ?? 0),
    rejectedDevices: Number(rejectedResult[0]?.count ?? 0),
    quarantinedDevices: Number(quarantinedResult[0]?.count ?? 0),
    newDevicesToday: Number(newTodayResult[0]?.count ?? 0),
    syncedDevices: Number(syncedResult[0]?.count ?? 0),
    openAlerts: Number(openAlertsResult[0]?.count ?? 0),
  });
});

router.get("/devices-by-vlan", async (req, res) => {
  const rows = await db
    .select({
      id: vlansTable.id,
      name: vlansTable.name,
      count: sql<number>`count(${devicesTable.id})`,
    })
    .from(vlansTable)
    .leftJoin(devicesTable, eq(devicesTable.vlanId, vlansTable.id))
    .groupBy(vlansTable.id, vlansTable.name)
    .orderBy(desc(sql`count(${devicesTable.id})`));

  res.json(rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) })));
});

router.get("/devices-by-site", async (req, res) => {
  const rows = await db
    .select({
      id: sitesTable.id,
      name: sitesTable.name,
      count: sql<number>`count(${devicesTable.id})`,
    })
    .from(sitesTable)
    .leftJoin(devicesTable, eq(devicesTable.siteId, sitesTable.id))
    .groupBy(sitesTable.id, sitesTable.name)
    .orderBy(desc(sql`count(${devicesTable.id})`));

  res.json(rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) })));
});

router.get("/devices-by-department", async (req, res) => {
  const rows = await db
    .select({
      name: devicesTable.department,
      count: sql<number>`count(*)`,
    })
    .from(devicesTable)
    .where(sql`${devicesTable.department} is not null`)
    .groupBy(devicesTable.department)
    .orderBy(desc(sql`count(*)`));

  res.json(rows.map((r) => ({ name: r.name ?? "Unknown", count: Number(r.count) })));
});

router.get("/recent-activity", async (req, res) => {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(20);

  res.json(logs);
});

export default router;
