import { Router } from "express";
import { db, vlansTable, devicesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateVlanBody, UpdateVlanBody } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db
    .select({
      vlan: vlansTable,
      deviceCount: sql<number>`count(${devicesTable.id})`,
    })
    .from(vlansTable)
    .leftJoin(devicesTable, eq(devicesTable.vlanId, vlansTable.id))
    .groupBy(vlansTable.id)
    .orderBy(vlansTable.vlanId);

  res.json(
    rows.map((r) => ({
      ...r.vlan,
      deviceCount: Number(r.deviceCount),
    }))
  );
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [vlan] = await db.select().from(vlansTable).where(eq(vlansTable.id, id));
  if (!vlan) return res.status(404).json({ error: "VLAN not found" });
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(devicesTable)
    .where(eq(devicesTable.vlanId, id));
  res.json({ ...vlan, deviceCount: Number(count) });
});

router.post("/", async (req, res) => {
  const parsed = CreateVlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [vlan] = await db.insert(vlansTable).values(parsed.data).returning();
  res.status(201).json({ ...vlan, deviceCount: 0 });
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateVlanBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [vlan] = await db.update(vlansTable).set(parsed.data).where(eq(vlansTable.id, id)).returning();
  if (!vlan) return res.status(404).json({ error: "VLAN not found" });
  res.json({ ...vlan, deviceCount: 0 });
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(vlansTable).where(eq(vlansTable.id, id));
  res.status(204).send();
});

export default router;
