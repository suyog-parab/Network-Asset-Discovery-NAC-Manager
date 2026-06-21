import { Router } from "express";
import { db, discoveryJobsTable, discoverySourcesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateDiscoveryJobBody, CreateDiscoverySourceBody, UpdateDiscoverySourceBody } from "@workspace/api-zod";
import { runSnmpDiscoveryJob } from "../services/discovery-worker";
import { testSnmpConnection } from "../services/snmp";
import { logger } from "../lib/logger";

const router = Router();

router.get("/jobs", async (req, res) => {
  const jobs = await db.select().from(discoveryJobsTable).orderBy(desc(discoveryJobsTable.createdAt)).limit(100);
  res.json(jobs);
});

router.post("/jobs", async (req, res) => {
  const parsed = CreateDiscoveryJobBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  let source: typeof discoverySourcesTable.$inferSelect | null = null;
  if (parsed.data.sourceId) {
    const [s] = await db.select().from(discoverySourcesTable).where(eq(discoverySourcesTable.id, parsed.data.sourceId));
    if (!s) return res.status(404).json({ error: "Discovery source not found" });
    source = s;
  }

  const [job] = await db
    .insert(discoveryJobsTable)
    .values({
      type: parsed.data.type,
      sourceId: parsed.data.sourceId ?? null,
      sourceName: source?.name ?? null,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();

  setImmediate(async () => {
    try {
      if (source && (source.type === "snmp" || parsed.data.type === "snmp")) {
        await runSnmpDiscoveryJob(job.id, source);
      } else if (source) {
        await db
          .update(discoveryJobsTable)
          .set({
            status: "failed",
            errorMessage: `Source type '${source.type}' not yet implemented. Add the source configuration and try again.`,
            completedAt: new Date(),
          })
          .where(eq(discoveryJobsTable.id, job.id));
      } else {
        await db
          .update(discoveryJobsTable)
          .set({
            status: "failed",
            errorMessage: "No source specified. Select a configured discovery source to run a real poll.",
            completedAt: new Date(),
          })
          .where(eq(discoveryJobsTable.id, job.id));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ jobId: job.id, err }, "Discovery job crashed");
      await db
        .update(discoveryJobsTable)
        .set({ status: "failed", errorMessage: message, completedAt: new Date() })
        .where(eq(discoveryJobsTable.id, job.id))
        .catch(() => {});
    }
  });

  return res.status(201).json(job);
});

router.get("/jobs/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [job] = await db.select().from(discoveryJobsTable).where(eq(discoveryJobsTable.id, id));
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

router.get("/jobs/:id/logs", async (req, res) => {
  const jobId = parseInt(req.params.id);
  const { integrationLogsTable } = await import("@workspace/db");
  const logs = await db
    .select()
    .from(integrationLogsTable)
    .where(eq(integrationLogsTable.jobId, jobId))
    .orderBy(integrationLogsTable.createdAt);
  res.json(logs);
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

router.post("/sources/:id/test", async (req, res) => {
  const id = parseInt(req.params.id);
  const [source] = await db.select().from(discoverySourcesTable).where(eq(discoverySourcesTable.id, id));
  if (!source) return res.status(404).json({ error: "Source not found" });

  if (source.type === "snmp") {
    const result = await testSnmpConnection({
      host: source.host,
      port: source.port ?? 161,
      version: (source.snmpVersion as "v2c" | "v3") ?? "v2c",
      community: source.community ?? "public",
      username: source.username ?? undefined,
      authProtocol: source.snmpAuthProtocol ?? undefined,
      privProtocol: source.snmpPrivProtocol ?? undefined,
      authKey: source.snmpAuthKey ?? undefined,
      privKey: source.snmpPrivKey ?? undefined,
      contextName: source.snmpContextName ?? undefined,
      timeout: 5000,
      retries: 1,
    });

    await db
      .update(discoverySourcesTable)
      .set({
        lastRunStatus: result.success ? "success" : "failed",
        lastError: result.error ?? null,
      })
      .where(eq(discoverySourcesTable.id, id));

    return res.json(result);
  }

  return res.status(400).json({
    error: `Connection test for source type '${source.type}' is not yet implemented.`,
    supported: ["snmp"],
  });
});

export default router;
