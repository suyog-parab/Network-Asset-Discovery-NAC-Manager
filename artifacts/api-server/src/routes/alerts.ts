import { Router } from "express";
import { db, alertsTable, devicesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { ListAlertsQueryParams } from "@workspace/api-zod";

const router = Router();

async function enrichAlert(alert: typeof alertsTable.$inferSelect) {
  let device = null;
  if (alert.deviceId) {
    const [d] = await db.select().from(devicesTable).where(eq(devicesTable.id, alert.deviceId));
    device = d ?? null;
  }
  return { ...alert, device };
}

router.get("/counts", async (req, res) => {
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable);
  const [open] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.status, "open"));
  const [critical] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(and(eq(alertsTable.severity, "critical"), eq(alertsTable.status, "open")));
  const [warning] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(and(eq(alertsTable.severity, "warning"), eq(alertsTable.status, "open")));
  const [info] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(and(eq(alertsTable.severity, "info"), eq(alertsTable.status, "open")));

  res.json({
    total: Number(total?.count ?? 0),
    open: Number(open?.count ?? 0),
    critical: Number(critical?.count ?? 0),
    warning: Number(warning?.count ?? 0),
    info: Number(info?.count ?? 0),
  });
});

router.get("/", async (req, res) => {
  const parsed = ListAlertsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { status, severity, page = 1, limit = 50 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(alertsTable.status, status));
  if (severity) conditions.push(eq(alertsTable.severity, severity));

  let query = db.select().from(alertsTable).$dynamic();
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(alertsTable).$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
    countQuery = countQuery.where(and(...conditions));
  }

  const [alerts, countResult] = await Promise.all([
    query.orderBy(desc(alertsTable.createdAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  const enriched = await Promise.all(alerts.map(enrichAlert));

  res.json({
    data: enriched,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  });
});

router.post("/:id/acknowledge", async (req, res) => {
  const id = parseInt(req.params.id);
  const [alert] = await db
    .update(alertsTable)
    .set({ status: "acknowledged", acknowledgedBy: "admin" })
    .where(eq(alertsTable.id, id))
    .returning();
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(await enrichAlert(alert));
});

router.post("/:id/resolve", async (req, res) => {
  const id = parseInt(req.params.id);
  const [alert] = await db
    .update(alertsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(alertsTable.id, id))
    .returning();
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  res.json(await enrichAlert(alert));
});

export default router;
