import { Router } from "express";
import { db, switchesTable, sitesTable, devicesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateSwitchBody, UpdateSwitchBody } from "@workspace/api-zod";

const router = Router();

async function formatSwitch(sw: typeof switchesTable.$inferSelect) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(devicesTable)
    .where(eq(devicesTable.switchName, sw.name));

  let site = null;
  if (sw.siteId) {
    const [s] = await db.select().from(sitesTable).where(eq(sitesTable.id, sw.siteId));
    site = s ?? null;
  }
  return { ...sw, deviceCount: Number(count), site };
}

router.get("/", async (req, res) => {
  const switches = await db.select().from(switchesTable).orderBy(switchesTable.name);
  const result = await Promise.all(switches.map(formatSwitch));
  res.json(result);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [sw] = await db.select().from(switchesTable).where(eq(switchesTable.id, id));
  if (!sw) return res.status(404).json({ error: "Switch not found" });
  res.json(await formatSwitch(sw));
});

router.post("/", async (req, res) => {
  const parsed = CreateSwitchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [sw] = await db.insert(switchesTable).values(parsed.data).returning();
  res.status(201).json({ ...sw, deviceCount: 0, site: null });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateSwitchBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [sw] = await db.update(switchesTable).set(parsed.data).where(eq(switchesTable.id, id)).returning();
  if (!sw) return res.status(404).json({ error: "Switch not found" });
  res.json(await formatSwitch(sw));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(switchesTable).where(eq(switchesTable.id, id));
  res.status(204).send();
});

export default router;
