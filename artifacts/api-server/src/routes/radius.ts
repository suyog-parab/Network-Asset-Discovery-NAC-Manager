import { Router } from "express";
import { db, radiusClientsTable, radiusGroupsTable, vlansTable, devicesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
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

export default router;
