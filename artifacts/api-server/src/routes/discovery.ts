import { Router } from "express";
import { db, discoveryJobsTable, discoverySourcesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateDiscoveryJobBody, CreateDiscoverySourceBody, UpdateDiscoverySourceBody } from "@workspace/api-zod";

const router = Router();

router.get("/jobs", async (req, res) => {
  const jobs = await db.select().from(discoveryJobsTable).orderBy(desc(discoveryJobsTable.createdAt)).limit(100);
  res.json(jobs);
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateDiscoveryJobBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  let sourceName: string | null = null;
  if (parsed.data.sourceId) {
    const [source] = await db.select().from(discoverySourcesTable).where(eq(discoverySourcesTable.id, parsed.data.sourceId));
    sourceName = source?.name ?? null;
  }

  const [job] = await db
    .insert(discoveryJobsTable)
    .values({
      type: parsed.data.type,
      sourceId: parsed.data.sourceId ?? null,
      sourceName,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();

  setTimeout(async () => {
    const devicesFound = Math.floor(Math.random() * 20) + 1;
    const devicesNew = Math.floor(devicesFound * 0.3);
    await db
      .update(discoveryJobsTable)
      .set({
        status: "completed",
        devicesFound,
        devicesNew,
        devicesUpdated: devicesFound - devicesNew,
        completedAt: new Date(),
      })
      .where(eq(discoveryJobsTable.id, job.id));

    if (parsed.data.sourceId) {
      await db
        .update(discoverySourcesTable)
        .set({ lastRunAt: new Date(), lastRunStatus: "success" })
        .where(eq(discoverySourcesTable.id, parsed.data.sourceId!));
    }
  }, 3000);

  res.status(201).json(job);
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(discoveryJobsTable).where(eq(discoveryJobsTable.id, id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

router.get("/sources", async (req, res) => {
  const sources = await db.select().from(discoverySourcesTable).orderBy(discoverySourcesTable.name);
  res.json(sources);
});

router.post("/sources", async (req, res) => {
  const parsed = CreateDiscoverySourceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [source] = await db.insert(discoverySourcesTable).values(parsed.data).returning();
  res.status(201).json(source);
});

router.put("/sources/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateDiscoverySourceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [source] = await db.update(discoverySourcesTable).set(parsed.data).where(eq(discoverySourcesTable.id, id)).returning();
  if (!source) return res.status(404).json({ error: "Source not found" });
  res.json(source);
});

router.delete("/sources/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(discoverySourcesTable).where(eq(discoverySourcesTable.id, id));
  res.status(204).send();
});

export default router;
