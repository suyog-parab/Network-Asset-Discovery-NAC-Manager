import { Router } from "express";
import { db, discoveryJobsTable, discoverySourcesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateDiscoveryJobBody, CreateDiscoverySourceBody, UpdateDiscoverySourceBody } from "@workspace/api-zod";
import { runSnmpDiscoveryJob } from "../services/discovery-worker";
import { testSnmpConnection } from "../services/snmp";
import { collectIscDhcpViaSSH, collectWindowsDhcp, testDhcpConnection } from "../services/dhcp";
import { bulkReverseResolve, testDnsConnection } from "../services/dns-resolver";
import { syncActiveDirectory, testLdapConnection } from "../services/ldap";
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
  } else {
    const allSources = await db.select().from(discoverySourcesTable).where(eq(discoverySourcesTable.enabled, true));
    if (allSources.length > 0) {
      source = allSources[0];
    }
  }

  const [job] = await db
    .insert(discoveryJobsTable)
    .values({
      type: source?.type ?? parsed.data.type,
      sourceId: source?.id ?? null,
      sourceName: source?.name ?? null,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();

  setImmediate(async () => {
    try {
      if (!source) {
        await db.update(discoveryJobsTable).set({
          status: "failed",
          errorMessage: "No source specified and no enabled sources found. Add a discovery source first.",
          completedAt: new Date(),
        }).where(eq(discoveryJobsTable.id, job.id));
        return;
      }

      const stype = source.type as string;

      if (stype === "snmp") {
        await runSnmpDiscoveryJob(job.id, source);

      } else if (stype === "dhcp_isc" || stype === "dhcp_windows") {
        await db.update(discoveryJobsTable).set({ status: "running" }).where(eq(discoveryJobsTable.id, job.id));

        const result = stype === "dhcp_isc"
          ? await collectIscDhcpViaSSH(
              source.host,
              source.port ?? 22,
              source.username ?? "root",
              source.password ?? undefined,
              source.privateKey ?? undefined
            )
          : await collectWindowsDhcp(source.host, source.username ?? "", source.password ?? "");

        await db.update(discoveryJobsTable).set({
          status: result.errors.length === 0 ? "completed" : result.leases.length > 0 ? "completed" : "failed",
          devicesFound: result.leases.length,
          devicesNew: 0,
          devicesUpdated: 0,
          completedAt: new Date(),
          errorMessage: result.errors.length > 0 ? result.errors.slice(0, 3).join("; ") : null,
        }).where(eq(discoveryJobsTable.id, job.id));

      } else if (stype === "dns") {
        await db.update(discoveryJobsTable).set({ status: "running" }).where(eq(discoveryJobsTable.id, job.id));

        const { devicesTable } = await import("@workspace/db");
        const { isNotNull, sql: sqlt } = await import("drizzle-orm");
        const devices = await db.select({ ip: devicesTable.ipAddress })
          .from(devicesTable)
          .where(isNotNull(devicesTable.ipAddress))
          .limit(500);

        const ips = devices.map((d) => d.ip as string);
        const dnsResult = await bulkReverseResolve(ips, source.host);

        let updated = 0;
        for (const r of dnsResult.resolved) {
          if (r.hostname && r.ipAddress) {
            const rows = await db.update(devicesTable)
              .set({ hostname: r.hostname, updatedAt: new Date() })
              .where(sqlt`${devicesTable.ipAddress} = ${r.ipAddress} AND ${devicesTable.hostname} IS NULL`)
              .returning();
            updated += rows.length;
          }
        }

        await db.update(discoveryJobsTable).set({
          status: "completed",
          devicesFound: dnsResult.resolved.length,
          devicesUpdated: updated,
          devicesNew: 0,
          completedAt: new Date(),
        }).where(eq(discoveryJobsTable.id, job.id));

      } else if (stype === "ad") {
        await db.update(discoveryJobsTable).set({ status: "running" }).where(eq(discoveryJobsTable.id, job.id));

        const adResult = await syncActiveDirectory(
          source.host,
          source.username ?? "",
          source.password ?? "",
          source.baseDn ?? `DC=${source.host.replace(/\./g, ",DC=")}`,
          source.lastHighestUsn ?? undefined
        );

        if (adResult.highestCommittedUSN) {
          await db.update(discoverySourcesTable).set({
            lastHighestUsn: adResult.highestCommittedUSN,
            lastRunAt: new Date(),
            lastRunStatus: adResult.errors.length === 0 ? "success" : "failed",
          }).where(eq(discoverySourcesTable.id, source.id));
        }

        await db.update(discoveryJobsTable).set({
          status: adResult.errors.length === 0 ? "completed" : "failed",
          devicesFound: adResult.computers.length,
          devicesNew: 0,
          devicesUpdated: 0,
          completedAt: new Date(),
          errorMessage: adResult.errors.length > 0 ? adResult.errors.slice(0, 3).join("; ") : null,
        }).where(eq(discoveryJobsTable.id, job.id));

      } else {
        await db.update(discoveryJobsTable).set({
          status: "failed",
          errorMessage: `Source type '${stype}' not yet supported.`,
          completedAt: new Date(),
        }).where(eq(discoveryJobsTable.id, job.id));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ jobId: job.id, err }, "Discovery job crashed");
      await db.update(discoveryJobsTable).set({
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      }).where(eq(discoveryJobsTable.id, job.id)).catch(() => {});
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

  const stype = source.type as string;
  let result: { success: boolean; latencyMs: number; error?: string; serverInfo?: string };

  if (stype === "snmp") {
    result = await testSnmpConnection({
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
  } else if (stype === "dhcp_isc" || stype === "dhcp_windows") {
    result = await testDhcpConnection(
      stype,
      source.host,
      source.port ?? 22,
      source.username ?? "",
      source.password ?? undefined
    );
  } else if (stype === "dns") {
    result = await testDnsConnection(source.host);
  } else if (stype === "ad") {
    result = await testLdapConnection(
      source.host.startsWith("ldap") ? source.host : `ldap://${source.host}`,
      source.username ?? "",
      source.password ?? ""
    );
  } else {
    return res.status(400).json({ error: `Connection test not supported for source type '${stype}'.` });
  }

  await db.update(discoverySourcesTable).set({
    lastRunStatus: result.success ? "success" : "failed",
    lastError: result.error ?? null,
    lastRunAt: new Date(),
  }).where(eq(discoverySourcesTable.id, id));

  return res.json(result);
});

export default router;
