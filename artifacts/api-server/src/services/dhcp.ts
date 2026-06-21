import * as dns from "dns";
import { logger } from "../lib/logger";

export interface DhcpLease {
  macAddress: string;
  ipAddress: string;
  hostname: string | null;
  leaseStart: Date | null;
  leaseEnd: Date | null;
  state: string;
}

export interface DhcpCollectResult {
  leases: DhcpLease[];
  errors: string[];
  durationMs: number;
}

export interface DhcpConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  serverType?: string;
}

function normalizeMac(raw: string): string {
  const clean = raw.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length !== 12) return raw.toLowerCase();
  return clean.match(/.{2}/g)!.join(":").toLowerCase();
}

export async function parseIscDhcpLeasesContent(content: string): Promise<DhcpLease[]> {
  const leases: DhcpLease[] = [];
  const leaseBlocks = content.match(/lease\s+[\d.]+\s*\{[^}]+\}/g) ?? [];

  for (const block of leaseBlocks) {
    const ipMatch = block.match(/lease\s+([\d.]+)/);
    const macMatch = block.match(/hardware\s+ethernet\s+([0-9a-fA-F:]+)/);
    const hostnameMatch = block.match(/client-hostname\s+"([^"]+)"/);
    const startMatch = block.match(/starts\s+\d+\s+([\d/]+\s+[\d:]+)/);
    const endMatch = block.match(/ends\s+\d+\s+([\d/]+\s+[\d:]+)/);
    const bindingMatch = block.match(/binding\s+state\s+(\w+)/);

    if (!ipMatch || !macMatch) continue;

    const ip = ipMatch[1];
    const mac = normalizeMac(macMatch[1]);
    const state = bindingMatch?.[1] ?? "unknown";

    const parseLeaseDate = (s: string | undefined): Date | null => {
      if (!s) return null;
      try { return new Date(s.replace(/\//g, "-")); } catch { return null; }
    };

    leases.push({
      macAddress: mac,
      ipAddress: ip,
      hostname: hostnameMatch?.[1] ?? null,
      leaseStart: parseLeaseDate(startMatch?.[1]),
      leaseEnd: parseLeaseDate(endMatch?.[1]),
      state,
    });
  }

  return leases;
}

export async function collectIscDhcpViaSSH(
  host: string,
  port: number = 22,
  username: string,
  password?: string,
  privateKey?: string
): Promise<DhcpCollectResult> {
  const start = Date.now();
  const errors: string[] = [];

  try {
    const { Client } = await import("ssh2");

    const leaseContent = await new Promise<string>((resolve, reject) => {
      const conn = new Client();
      let output = "";
      const timeout = setTimeout(() => {
        conn.end();
        reject(new Error("SSH connection timeout (30s)"));
      }, 30000);

      conn.on("ready", () => {
        conn.exec("cat /var/lib/dhcpd/dhcpd.leases 2>/dev/null || cat /var/lib/dhcp/dhcpd.leases 2>/dev/null", (err, stream) => {
          if (err) { clearTimeout(timeout); conn.end(); reject(err); return; }

          stream.on("data", (data: Buffer) => { output += data.toString(); });
          stream.stderr.on("data", (data: Buffer) => {
            errors.push(`SSH stderr: ${data.toString().trim()}`);
          });
          stream.on("close", () => { clearTimeout(timeout); conn.end(); resolve(output); });
        });
      });

      conn.on("error", (err) => { clearTimeout(timeout); reject(err); });

      const connectConfig: Record<string, unknown> = {
        host,
        port,
        username,
        readyTimeout: 20000,
      };

      if (privateKey) connectConfig.privateKey = privateKey;
      else if (password) connectConfig.password = password;

      conn.connect(connectConfig as Parameters<typeof conn.connect>[0]);
    });

    const leases = await parseIscDhcpLeasesContent(leaseContent);

    logger.info({ host, leases: leases.length, durationMs: Date.now() - start }, "ISC DHCP collection complete");
    return { leases, errors, durationMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    logger.error({ host, err }, "ISC DHCP collection failed");
    return { leases: [], errors, durationMs: Date.now() - start };
  }
}

export async function collectWindowsDhcp(
  host: string,
  username: string,
  password: string
): Promise<DhcpCollectResult> {
  const start = Date.now();
  const errors: string[] = [];
  const leases: DhcpLease[] = [];

  try {
    const { Client } = await import("ssh2");

    const output = await new Promise<string>((resolve, reject) => {
      const conn = new Client();
      let data = "";
      const timeout = setTimeout(() => { conn.end(); reject(new Error("SSH timeout")); }, 30000);

      conn.on("ready", () => {
        const cmd = `Get-DhcpServerv4Lease -ScopeId 0.0.0.0 -AllLeases | ConvertTo-Json -Compress`;
        conn.exec(`powershell -Command "${cmd}"`, (err, stream) => {
          if (err) { clearTimeout(timeout); conn.end(); reject(err); return; }
          stream.on("data", (d: Buffer) => { data += d.toString(); });
          stream.stderr.on("data", (d: Buffer) => errors.push(d.toString().trim()));
          stream.on("close", () => { clearTimeout(timeout); conn.end(); resolve(data); });
        });
      });

      conn.on("error", reject);
      conn.connect({ host, port: 22, username, password });
    });

    if (output.trim()) {
      const raw = JSON.parse(output);
      const entries = Array.isArray(raw) ? raw : [raw];
      for (const e of entries) {
        if (!e.IPAddress || !e.ClientId) continue;
        leases.push({
          macAddress: normalizeMac(e.ClientId),
          ipAddress: e.IPAddress,
          hostname: e.HostName ?? null,
          leaseStart: e.LeaseExpiryTime ? new Date(e.LeaseExpiryTime) : null,
          leaseEnd: e.LeaseExpiryTime ? new Date(e.LeaseExpiryTime) : null,
          state: e.AddressState ?? "active",
        });
      }
    }

    logger.info({ host, leases: leases.length }, "Windows DHCP collection complete");
    return { leases, errors, durationMs: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    logger.error({ host, err }, "Windows DHCP collection failed");
    return { leases: [], errors, durationMs: Date.now() - start };
  }
}

export async function testDhcpConnection(
  type: "dhcp_isc" | "dhcp_windows",
  host: string,
  port: number,
  username: string,
  password?: string
): Promise<DhcpConnectionTestResult> {
  const start = Date.now();
  try {
    const { Client } = await import("ssh2");

    await new Promise<void>((resolve, reject) => {
      const conn = new Client();
      const timeout = setTimeout(() => { conn.end(); reject(new Error("Connection timeout (10s)")); }, 10000);

      conn.on("ready", () => {
        clearTimeout(timeout);
        conn.end();
        resolve();
      });

      conn.on("error", (err) => { clearTimeout(timeout); reject(err); });

      const cfg: Record<string, unknown> = { host, port: port ?? 22, username, readyTimeout: 8000 };
      if (password) cfg.password = password;
      conn.connect(cfg as Parameters<typeof conn.connect>[0]);
    });

    return { success: true, latencyMs: Date.now() - start, serverType: type };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
