import { Router } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListAuditLogsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const { userId, action, page = 1, limit = 50 } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (userId) conditions.push(eq(auditLogsTable.userId, userId));
  if (action) conditions.push(eq(auditLogsTable.action, action));

  let query = db.select().from(auditLogsTable).$dynamic();
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogsTable).$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
    countQuery = countQuery.where(and(...conditions));
  }

  const [logs, countResult] = await Promise.all([
    query.orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  res.json({
    data: logs,
    total: Number(countResult[0]?.count ?? 0),
    page,
    limit,
  });
});

export default router;
