import { Router } from "express";
import { db, devicesTable, vlansTable, sitesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

router.get("/inventory", async (req, res) => {
  const [
    totalResult,
    byStatusResult,
    byVlanResult,
    bySiteResult,
    byVendorResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(devicesTable),
    db.select({ name: devicesTable.status, count: sql<number>`count(*)` }).from(devicesTable).groupBy(devicesTable.status),
    db
      .select({ name: vlansTable.name, count: sql<number>`count(${devicesTable.id})` })
      .from(vlansTable)
      .leftJoin(devicesTable, eq(devicesTable.vlanId, vlansTable.id))
      .groupBy(vlansTable.name),
    db
      .select({ name: sitesTable.name, count: sql<number>`count(${devicesTable.id})` })
      .from(sitesTable)
      .leftJoin(devicesTable, eq(devicesTable.siteId, sitesTable.id))
      .groupBy(sitesTable.name),
    db
      .select({ name: devicesTable.vendor, count: sql<number>`count(*)` })
      .from(devicesTable)
      .where(sql`${devicesTable.vendor} is not null`)
      .groupBy(devicesTable.vendor)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ]);

  res.json({
    generatedAt: new Date().toISOString(),
    totalDevices: Number(totalResult[0]?.count ?? 0),
    byStatus: byStatusResult.map((r) => ({ name: r.name ?? "Unknown", count: Number(r.count) })),
    byVlan: byVlanResult.map((r) => ({ name: r.name, count: Number(r.count) })),
    bySite: bySiteResult.map((r) => ({ name: r.name, count: Number(r.count) })),
    byVendor: byVendorResult.map((r) => ({ name: r.name ?? "Unknown", count: Number(r.count) })),
  });
});

router.get("/compliance", async (req, res) => {
  const [
    totalResult,
    approvedResult,
    pendingResult,
    quarantinedResult,
    rejectedResult,
    unsyncedResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(devicesTable),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "APPROVED")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "PENDING")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "QUARANTINED")),
    db.select({ count: sql<number>`count(*)` }).from(devicesTable).where(eq(devicesTable.status, "REJECTED")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(devicesTable)
      .where(and(eq(devicesTable.status, "APPROVED"), eq(devicesTable.radiusSynced, false))),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const approved = Number(approvedResult[0]?.count ?? 0);
  const complianceRate = total > 0 ? Math.round((approved / total) * 100 * 10) / 10 : 0;

  res.json({
    generatedAt: new Date().toISOString(),
    complianceRate,
    totalDevices: total,
    approvedDevices: approved,
    pendingDevices: Number(pendingResult[0]?.count ?? 0),
    quarantinedDevices: Number(quarantinedResult[0]?.count ?? 0),
    rejectedDevices: Number(rejectedResult[0]?.count ?? 0),
    unsyncedApproved: Number(unsyncedResult[0]?.count ?? 0),
  });
});

export default router;
