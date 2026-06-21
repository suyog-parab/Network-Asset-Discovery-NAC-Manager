import {
  db,
  discoveryJobsTable,
  discoverySourcesTable,
  devicesTable,
  deviceHistoryTable,
  alertsTable,
  integrationLogsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { pollSwitch, testSnmpConnection, type SnmpSessionConfig } from "./snmp";
import { logger } from "../lib/logger";

async function writeLog(
  jobId: number | null,
  sourceId: number | null,
  level: "info" | "warn" | "error" | "debug",
  message: string,
  details?: object
) {
  try {
    await db.insert(integrationLogsTable).values({
      jobId,
      sourceId,
      level,
      message,
      details: details ? JSON.stringify(details) : null,
    });
  } catch {
    logger.warn({ jobId, sourceId, message }, "Failed to write integration log");
  }
}

async function upsertDevice(
  mac: string,
  ipAddress: string | null,
  switchName: string,
  switchPort: string | null,
  vlanId: number | null,
  jobId: number
): Promise<"new" | "updated"> {
  const normalized = mac.toLowerCase().trim();

  const [existing] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.macAddress, normalized));

  if (!existing) {
    await db.insert(devicesTable).values({
      macAddress: normalized,
      ipAddress,
      switchName,
      switchPort,
      vlanId,
      status: "DISCOVERED",
      firstSeen: new Date(),
      lastSeen: new Date(),
    });
    return "new";
  }

  const changes: string[] = [];
  if (existing.ipAddress !== ipAddress && ipAddress) changes.push(`ip: ${existing.ipAddress} → ${ipAddress}`);
  if (existing.switchPort !== switchPort && switchPort) changes.push(`port: ${existing.switchPort} → ${switchPort}`);
  if (existing.switchName !== switchName) changes.push(`switch: ${existing.switchName} → ${switchName}`);

  const portMoved =
    (existing.switchName !== switchName || existing.switchPort !== switchPort) &&
    existing.switchPort !== null;

  await db
    .update(devicesTable)
    .set({
      ipAddress: ipAddress ?? existing.ipAddress,
      switchName,
      switchPort: switchPort ?? existing.switchPort,
      vlanId: vlanId ?? existing.vlanId,
      lastSeen: new Date(),
    })
    .where(eq(devicesTable.id, existing.id));

  if (portMoved) {
    await db.insert(deviceHistoryTable).values({
      deviceId: existing.id,
      action: "port_move",
      oldStatus: existing.status,
      newStatus: existing.status,
      oldVlan: existing.vlanId?.toString() ?? null,
      newVlan: vlanId?.toString() ?? null,
      notes: `Port move detected by SNMP poll (job ${jobId}): ${changes.join(", ")}`,
    });

    await db.insert(alertsTable).values({
      type: "port_move",
      severity: "warning",
      status: "open",
      message: `Port move detected for ${normalized}: ${changes.join(", ")}`,
      deviceId: existing.id,
    });
  }

  if (changes.length > 0) {
    await writeLog(jobId, null, "info", `Device updated: ${normalized}`, { changes });
  }

  return "updated";
}

export async function runSnmpDiscoveryJob(jobId: number, source: typeof discoverySourcesTable.$inferSelect): Promise<void> {
  const log = (level: "info" | "warn" | "error", msg: string, details?: object) =>
    writeLog(jobId, source.id, level, msg, details);

  await db
    .update(discoveryJobsTable)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(discoveryJobsTable.id, jobId));

  await log("info", `SNMP discovery started for ${source.name} (${source.host})`);

  const cfg: SnmpSessionConfig = {
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
    timeout: 15000,
    retries: 3,
  };

  let pollResult;
  let lastError: string | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await log("info", `Poll attempt ${attempt}/${maxAttempts}`);
      pollResult = await pollSwitch(cfg);
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await log("warn", `Poll attempt ${attempt} failed: ${lastError}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  if (!pollResult) {
    await log("error", `All ${maxAttempts} attempts failed. Last error: ${lastError}`);

    await db
      .update(discoveryJobsTable)
      .set({
        status: "failed",
        errorMessage: lastError,
        completedAt: new Date(),
      })
      .where(eq(discoveryJobsTable.id, jobId));

    await db
      .update(discoverySourcesTable)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: "failed",
        lastError,
        consecutiveFailures: sql`${discoverySourcesTable.consecutiveFailures} + 1`,
      })
      .where(eq(discoverySourcesTable.id, source.id));

    return;
  }

  for (const e of pollResult.errors) {
    await log("warn", `SNMP warning: ${e}`);
  }

  await log("info", `Poll complete: ${pollResult.devices.length} devices found, ${pollResult.errors.length} warnings`, {
    durationMs: pollResult.durationMs,
    interfaceCount: pollResult.interfaceCount,
  });

  let devicesNew = 0;
  let devicesUpdated = 0;

  for (const device of pollResult.devices) {
    try {
      const outcome = await upsertDevice(
        device.macAddress,
        device.ipAddress,
        source.name,
        device.switchPort,
        device.vlanId,
        jobId
      );
      if (outcome === "new") devicesNew++;
      else devicesUpdated++;
    } catch (err) {
      await log("error", `Failed to upsert device ${device.macAddress}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await log("info", `Correlation complete: ${devicesNew} new, ${devicesUpdated} updated`);

  await db
    .update(discoveryJobsTable)
    .set({
      status: "completed",
      devicesFound: pollResult.devices.length,
      devicesNew,
      devicesUpdated,
      completedAt: new Date(),
    })
    .where(eq(discoveryJobsTable.id, jobId));

  await db
    .update(discoverySourcesTable)
    .set({
      lastRunAt: new Date(),
      lastRunStatus: "success",
      lastError: null,
      consecutiveFailures: 0,
    })
    .where(eq(discoverySourcesTable.id, source.id));
}
