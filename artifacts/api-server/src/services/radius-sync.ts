// eslint-disable-next-line @typescript-eslint/no-require-imports
const pg = require("pg") as typeof import("pg");
import { db, devicesTable, vlansTable, radiusClientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface RadiusSyncResult {
  synced: number;
  removed: number;
  failed: number;
  errors: string[];
}

export interface RadiusTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
}

function normalizeMacForRadius(mac: string): string {
  return mac.toLowerCase().replace(/[^0-9a-f]/g, "").replace(/(.{2})/g, "$1:").slice(0, 17);
}

async function getRadiusPool(): Promise<pg.Pool> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL not set");
  return new pg.Pool({ connectionString, max: 5 });
}

export async function syncDeviceToRadius(
  pool: pg.Pool,
  mac: string,
  vlanId: number | null,
  action: "approve" | "quarantine" | "remove"
): Promise<void> {
  const username = normalizeMacForRadius(mac);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM radcheck WHERE username = $1",
      [username]
    );
    await client.query(
      "DELETE FROM radreply WHERE username = $1",
      [username]
    );
    await client.query(
      "DELETE FROM radusergroup WHERE username = $1",
      [username]
    );

    if (action === "remove") {
      await client.query("COMMIT");
      logger.info({ mac: username }, "RADIUS: device removed");
      return;
    }

    await client.query(
      "INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, $2, $3, $4)",
      [username, "Auth-Type", ":=", "Accept"]
    );

    let vlanNumber: number | null = null;

    if (action === "quarantine") {
      vlanNumber = 999;
    } else if (vlanId) {
      const [vlan] = await db.select().from(vlansTable).where(eq(vlansTable.id, vlanId));
      vlanNumber = vlan?.vlanId ?? null;
    }

    if (vlanNumber !== null) {
      const replyAttrs = [
        [username, "Tunnel-Type", "=", "VLAN"],
        [username, "Tunnel-Medium-Type", "=", "IEEE-802"],
        [username, "Tunnel-Private-Group-ID", "=", String(vlanNumber)],
      ];

      for (const [u, attr, op, val] of replyAttrs) {
        await client.query(
          "INSERT INTO radreply (username, attribute, op, value) VALUES ($1, $2, $3, $4)",
          [u, attr, op, val]
        );
      }
    }

    await client.query("COMMIT");
    logger.info({ mac: username, action, vlanNumber }, "RADIUS: device synced");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function syncAllApprovedDevices(deviceIds?: number[]): Promise<RadiusSyncResult> {
  const errors: string[] = [];
  let synced = 0;
  let removed = 0;
  let failed = 0;

  const pool = await getRadiusPool();

  try {
    let query = db.select().from(devicesTable).$dynamic();
    if (deviceIds && deviceIds.length > 0) {
      query = query.where(sql`${devicesTable.id} = ANY(${deviceIds})`);
    } else {
      query = query.where(eq(devicesTable.status, "APPROVED"));
    }

    const devices = await query;
    logger.info({ count: devices.length }, "RADIUS sync: starting device sync");

    for (const device of devices) {
      try {
        await syncDeviceToRadius(pool, device.macAddress, device.vlanId, "approve");
        await db
          .update(devicesTable)
          .set({ radiusSynced: true, status: "SYNCED" })
          .where(eq(devicesTable.id, device.id));
        synced++;
      } catch (err) {
        const msg = `Failed to sync ${device.macAddress}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        failed++;
        logger.error({ mac: device.macAddress, err }, "RADIUS sync device failed");
      }
    }

    const rejectedDevices = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.status, "REJECTED"));

    for (const device of rejectedDevices) {
      try {
        await syncDeviceToRadius(pool, device.macAddress, null, "remove");
        removed++;
      } catch (err) {
        const msg = `Failed to remove rejected device ${device.macAddress}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        failed++;
      }
    }

    logger.info({ synced, removed, failed }, "RADIUS sync complete");
    return { synced, removed, failed, errors };
  } finally {
    await pool.end();
  }
}

export async function quarantineDeviceInRadius(mac: string): Promise<void> {
  const pool = await getRadiusPool();
  try {
    await syncDeviceToRadius(pool, mac, null, "quarantine");
  } finally {
    await pool.end();
  }
}

export async function removeDeviceFromRadius(mac: string): Promise<void> {
  const pool = await getRadiusPool();
  try {
    await syncDeviceToRadius(pool, mac, null, "remove");
  } finally {
    await pool.end();
  }
}

export async function sendRadiusCoA(
  nasIp: string,
  mac: string,
  vlanId: number,
  radiusSecret: string
): Promise<{ success: boolean; error?: string }> {
  const normalizedMac = mac.toUpperCase().replace(/[^0-9A-F]/g, "").replace(/(.{2})/g, "$1:").slice(0, 17);

  try {
    const { spawn } = await import("child_process");

    const coaPayload = [
      `Calling-Station-Id="${normalizedMac}"`,
      `Tunnel-Type=VLAN`,
      `Tunnel-Medium-Type=IEEE-802`,
      `Tunnel-Private-Group-ID=${vlanId}`,
    ].join("\n");

    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn("radclient", ["-t", "5", "-r", "2", `${nasIp}:3799`, "coa", radiusSecret], {
        timeout: 15000,
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
      child.stderr.on("data", (d: Buffer) => { err += d.toString(); });
      child.stdin.write(coaPayload);
      child.stdin.end();
      child.on("close", (code) => {
        if (code !== 0 && code !== null) reject(new Error(`radclient exited with code ${code}: ${err}`));
        else resolve({ stdout: out, stderr: err });
      });
      child.on("error", reject);
    });

    const success = stdout.includes("Access-Accept") || stdout.includes("CoA-ACK");

    if (!success && stderr) {
      logger.warn({ nasIp, mac: normalizedMac, stderr }, "CoA may have failed");
    }

    logger.info({ nasIp, mac: normalizedMac, vlanId, success }, "RADIUS CoA sent");
    return { success };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ nasIp, mac, err }, "CoA send failed");
    return { success: false, error: message };
  }
}
