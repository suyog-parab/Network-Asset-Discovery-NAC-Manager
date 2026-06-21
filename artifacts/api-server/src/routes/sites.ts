import { Router } from "express";
import { db, sitesTable, devicesTable, switchesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateSiteBody, UpdateSiteBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select({
      site: sitesTable,
      deviceCount: sql<number>`(select count(*) from devices where devices.site_id = sites.id)`,
      switchCount: sql<number>`(select count(*) from switches where switches.site_id = sites.id)`,
    })
    .from(sitesTable)
    .orderBy(sitesTable.name);

  res.json(rows.map((r) => ({
    ...r.site,
    deviceCount: Number(r.deviceCount),
    switchCount: Number(r.switchCount),
  })));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [site] = await db.select().from(sitesTable).where(eq(sitesTable.id, id));
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json({ ...site, deviceCount: 0, switchCount: 0 });
});

router.post("/", async (req, res) => {
  const parsed = CreateSiteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [site] = await db.insert(sitesTable).values(parsed.data).returning();
  res.status(201).json({ ...site, deviceCount: 0, switchCount: 0 });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateSiteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [site] = await db.update(sitesTable).set(parsed.data).where(eq(sitesTable.id, id)).returning();
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json({ ...site, deviceCount: 0, switchCount: 0 });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(sitesTable).where(eq(sitesTable.id, id));
  res.status(204).send();
});

export default router;
