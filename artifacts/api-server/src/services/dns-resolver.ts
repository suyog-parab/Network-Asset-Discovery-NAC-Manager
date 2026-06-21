import * as dnsPromises from "dns/promises";
import { logger } from "../lib/logger";

export interface DnsResolutionResult {
  ipAddress: string;
  hostname: string | null;
  ptrRecord: string | null;
  resolvedAt: Date;
  error?: string;
}

export interface BulkDnsResult {
  resolved: DnsResolutionResult[];
  failed: string[];
  durationMs: number;
}

export interface DnsConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  serverInfo?: string;
}

export async function reverseResolveIp(ip: string, dnsServer?: string): Promise<DnsResolutionResult> {
  if (dnsServer) {
    const resolver = new dnsPromises.Resolver();
    resolver.setServers([dnsServer]);
    try {
      const hostnames = await resolver.reverse(ip);
      const hostname = hostnames[0] ?? null;
      return { ipAddress: ip, hostname, ptrRecord: hostname, resolvedAt: new Date() };
    } catch (err) {
      return {
        ipAddress: ip,
        hostname: null,
        ptrRecord: null,
        resolvedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  try {
    const hostnames = await dnsPromises.reverse(ip);
    const hostname = hostnames[0] ?? null;
    return { ipAddress: ip, hostname, ptrRecord: hostname, resolvedAt: new Date() };
  } catch (err) {
    return {
      ipAddress: ip,
      hostname: null,
      ptrRecord: null,
      resolvedAt: new Date(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function forwardResolveHostname(
  hostname: string,
  dnsServer?: string
): Promise<{ hostname: string; ipAddresses: string[]; error?: string }> {
  if (dnsServer) {
    const resolver = new dnsPromises.Resolver();
    resolver.setServers([dnsServer]);
    try {
      const addresses = await resolver.resolve4(hostname);
      return { hostname, ipAddresses: addresses };
    } catch (err) {
      return { hostname, ipAddresses: [], error: err instanceof Error ? err.message : String(err) };
    }
  }

  try {
    const addresses = await dnsPromises.resolve4(hostname);
    return { hostname, ipAddresses: addresses };
  } catch (err) {
    return { hostname, ipAddresses: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function bulkReverseResolve(
  ipAddresses: string[],
  dnsServer?: string,
  concurrency: number = 20
): Promise<BulkDnsResult> {
  const start = Date.now();
  const resolved: DnsResolutionResult[] = [];
  const failed: string[] = [];

  logger.info({ count: ipAddresses.length, dnsServer }, "Starting bulk reverse DNS resolution");

  for (let i = 0; i < ipAddresses.length; i += concurrency) {
    const batch = ipAddresses.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((ip) => reverseResolveIp(ip, dnsServer))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        resolved.push(result.value);
        if (result.value.error) {
          failed.push(result.value.ipAddress);
        }
      }
    }
  }

  const durationMs = Date.now() - start;
  logger.info(
    { resolved: resolved.length, failed: failed.length, durationMs },
    "Bulk reverse DNS resolution complete"
  );

  return { resolved, failed, durationMs };
}

export async function testDnsConnection(
  host: string,
  testHostname: string = "google.com"
): Promise<DnsConnectionTestResult> {
  const start = Date.now();
  try {
    const resolver = new dnsPromises.Resolver();
    resolver.setServers([host]);
    const addresses = await resolver.resolve4(testHostname);
    return {
      success: addresses.length > 0,
      latencyMs: Date.now() - start,
      serverInfo: `DNS server at ${host} resolved ${testHostname} → ${addresses[0]}`,
    };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function enrichDevicesWithDns(
  devices: Array<{ macAddress: string; ipAddress: string | null; hostname: string | null }>,
  dnsServer?: string
): Promise<Map<string, string>> {
  const hostnameMap = new Map<string, string>();
  const ipsToResolve = devices
    .filter((d) => d.ipAddress && !d.hostname)
    .map((d) => d.ipAddress as string);

  if (ipsToResolve.length === 0) return hostnameMap;

  const result = await bulkReverseResolve(ipsToResolve, dnsServer);
  for (const r of result.resolved) {
    if (r.hostname) hostnameMap.set(r.ipAddress, r.hostname);
  }

  return hostnameMap;
}
