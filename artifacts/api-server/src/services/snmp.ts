import * as snmp from "net-snmp";
import { logger } from "../lib/logger";

export interface SnmpSessionConfig {
  host: string;
  port?: number;
  version?: "v2c" | "v3";
  community?: string;
  username?: string;
  authProtocol?: string;
  privProtocol?: string;
  authKey?: string;
  privKey?: string;
  contextName?: string;
  timeout?: number;
  retries?: number;
}

export interface DiscoveredDevice {
  macAddress: string;
  ipAddress: string | null;
  switchPort: string | null;
  vlanId: number | null;
  portStatus: "up" | "down" | "unknown";
}

export interface SnmpPollResult {
  devices: DiscoveredDevice[];
  interfaceCount: number;
  errors: string[];
  durationMs: number;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  sysDescr?: string;
  sysName?: string;
}

const OID = {
  sysDescr: "1.3.6.1.2.1.1.1.0",
  sysName: "1.3.6.1.2.1.1.5.0",
  sysUpTime: "1.3.6.1.2.1.1.3.0",
  ifDescr: "1.3.6.1.2.1.2.2.1.2",
  ifOperStatus: "1.3.6.1.2.1.2.2.1.8",
  ifAdminStatus: "1.3.6.1.2.1.2.2.1.7",
  ipNetToMediaPhysAddress: "1.3.6.1.2.1.3.1.1.2",
  ipNetToMediaNetAddress: "1.3.6.1.2.1.3.1.1.3",
  dot1dTpFdbAddress: "1.3.6.1.2.1.17.4.3.1.1",
  dot1dTpFdbPort: "1.3.6.1.2.1.17.4.3.1.2",
  dot1dTpFdbStatus: "1.3.6.1.2.1.17.4.3.1.3",
  dot1dBasePortIfIndex: "1.3.6.1.2.1.17.1.4.1.2",
  dot1qPvid: "1.3.6.1.2.1.17.7.1.4.5.1.1",
  dot1qVlanStaticName: "1.3.6.1.2.1.17.7.1.4.2.1.3",
} as const;

function normalizeMac(mac: Buffer | string): string {
  if (Buffer.isBuffer(mac)) {
    return Array.from(mac)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(":");
  }
  return mac
    .toLowerCase()
    .replace(/[.-]/g, ":")
    .replace(/:/g, "")
    .replace(/(.{2})/g, "$1:")
    .slice(0, 17);
}

function createSnmpSession(cfg: SnmpSessionConfig): snmp.Session {
  const options: snmp.SessionOptions = {
    port: cfg.port ?? 161,
    timeout: cfg.timeout ?? 10000,
    retries: cfg.retries ?? 2,
    version:
      cfg.version === "v3"
        ? snmp.Version3
        : snmp.Version2c,
  };

  if (cfg.version === "v3") {
    const authProto =
      cfg.authProtocol?.toUpperCase() === "SHA"
        ? snmp.AuthProtocols.sha
        : snmp.AuthProtocols.md5;
    const privProto =
      cfg.privProtocol?.toUpperCase() === "AES"
        ? snmp.PrivProtocols.aes
        : snmp.PrivProtocols.des;

    const user: snmp.User = {
      name: cfg.username ?? "nacuser",
      level:
        cfg.authKey && cfg.privKey
          ? snmp.SecurityLevel.authPriv
          : cfg.authKey
          ? snmp.SecurityLevel.authNoPriv
          : snmp.SecurityLevel.noAuthNoPriv,
      authProtocol: authProto,
      authKey: cfg.authKey ?? "",
      privProtocol: privProto,
      privKey: cfg.privKey ?? "",
    };

    return snmp.createV3Session(cfg.host, user, options);
  }

  return snmp.createSession(cfg.host, cfg.community ?? "public", options);
}

function walkSubtree(session: snmp.Session, oid: string): Promise<Map<string, snmp.Varbind>> {
  return new Promise((resolve, reject) => {
    const result = new Map<string, snmp.Varbind>();

    session.subtree(
      oid,
      50,
      (varbinds: snmp.Varbind[]) => {
        for (const vb of varbinds) {
          if (snmp.isVarbindError(vb)) continue;
          result.set(vb.oid, vb);
        }
      },
      (error: Error | null) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
}

function getOids(session: snmp.Session, oids: string[]): Promise<snmp.Varbind[]> {
  return new Promise((resolve, reject) => {
    session.get(oids, (error: Error | null, varbinds: snmp.Varbind[]) => {
      if (error) reject(error);
      else resolve(varbinds);
    });
  });
}

export async function testSnmpConnection(cfg: SnmpSessionConfig): Promise<ConnectionTestResult> {
  const start = Date.now();
  const session = createSnmpSession({ ...cfg, timeout: 5000, retries: 1 });

  try {
    const varbinds = await getOids(session, [OID.sysDescr, OID.sysName]);
    const latencyMs = Date.now() - start;

    if (!varbinds || varbinds.length === 0) {
      return { success: false, latencyMs, error: "No response from device" };
    }

    const sysDescr = varbinds[0] && !snmp.isVarbindError(varbinds[0])
      ? String(varbinds[0].value)
      : undefined;
    const sysName = varbinds[1] && !snmp.isVarbindError(varbinds[1])
      ? String(varbinds[1].value)
      : undefined;

    return { success: true, latencyMs, sysDescr, sysName };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    session.close();
  }
}

export async function pollSwitch(cfg: SnmpSessionConfig): Promise<SnmpPollResult> {
  const start = Date.now();
  const errors: string[] = [];
  const session = createSnmpSession(cfg);

  const macToIp = new Map<string, string>();
  const macToPort = new Map<string, number>();
  const portToIfIndex = new Map<number, number>();
  const ifIndexToName = new Map<number, string>();
  const ifIndexToStatus = new Map<number, string>();
  const portToVlan = new Map<number, number>();
  const devices: DiscoveredDevice[] = [];

  try {
    logger.info({ host: cfg.host }, "SNMP poll starting");

    // 1. Walk ARP table: IP → MAC
    try {
      const arpTable = await walkSubtree(session, OID.ipNetToMediaPhysAddress);
      for (const [oid, vb] of arpTable) {
        if (!Buffer.isBuffer(vb.value)) continue;
        const mac = normalizeMac(vb.value);
        const parts = oid.split(".");
        const ip = parts.slice(-4).join(".");
        macToIp.set(mac, ip);
      }
      logger.debug({ host: cfg.host, arpEntries: macToIp.size }, "ARP table walked");
    } catch (err) {
      const msg = `ARP walk failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      logger.warn({ host: cfg.host, err }, msg);
    }

    // 2. Walk MAC address table (dot1dTpFdb): MAC → bridge port
    try {
      const fdbTable = await walkSubtree(session, OID.dot1dTpFdbAddress);
      const fdbPorts = await walkSubtree(session, OID.dot1dTpFdbPort);
      const fdbStatus = await walkSubtree(session, OID.dot1dTpFdbStatus);

      for (const [oid, vb] of fdbTable) {
        if (!Buffer.isBuffer(vb.value)) continue;
        const mac = normalizeMac(vb.value);
        const suffix = oid.replace(OID.dot1dTpFdbAddress + ".", "");
        const portOid = OID.dot1dTpFdbPort + "." + suffix;
        const statusOid = OID.dot1dTpFdbStatus + "." + suffix;
        const statusVb = fdbStatus.get(statusOid);

        if (statusVb && Number(statusVb.value) === 3) {
          const portVb = fdbPorts.get(portOid);
          if (portVb) {
            macToPort.set(mac, Number(portVb.value));
          }
        }
      }
      logger.debug({ host: cfg.host, macEntries: macToPort.size }, "MAC table walked");
    } catch (err) {
      const msg = `MAC table walk failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      logger.warn({ host: cfg.host, err }, msg);
    }

    // 3. Walk bridge port → ifIndex mapping
    try {
      const portMap = await walkSubtree(session, OID.dot1dBasePortIfIndex);
      for (const [oid, vb] of portMap) {
        const bridgePort = parseInt(oid.split(".").pop() ?? "0", 10);
        portToIfIndex.set(bridgePort, Number(vb.value));
      }
    } catch (err) {
      errors.push(`Port-to-ifIndex walk failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 4. Walk interface descriptions and operational status
    try {
      const ifDescrs = await walkSubtree(session, OID.ifDescr);
      const ifStatuses = await walkSubtree(session, OID.ifOperStatus);

      for (const [oid, vb] of ifDescrs) {
        const ifIndex = parseInt(oid.split(".").pop() ?? "0", 10);
        ifIndexToName.set(ifIndex, String(vb.value));
      }
      for (const [oid, vb] of ifStatuses) {
        const ifIndex = parseInt(oid.split(".").pop() ?? "0", 10);
        ifIndexToStatus.set(ifIndex, Number(vb.value) === 1 ? "up" : "down");
      }
      logger.debug({ host: cfg.host, ifCount: ifIndexToName.size }, "Interface table walked");
    } catch (err) {
      errors.push(`Interface walk failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 5. Walk dot1qPvid: ifIndex → VLAN ID
    try {
      const pvidTable = await walkSubtree(session, OID.dot1qPvid);
      for (const [oid, vb] of pvidTable) {
        const ifIndex = parseInt(oid.split(".").pop() ?? "0", 10);
        portToVlan.set(ifIndex, Number(vb.value));
      }
    } catch (err) {
      errors.push(`PVID walk failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 6. Correlate: for each MAC → bridge port → ifIndex → interface name + VLAN
    const seenMacs = new Set<string>();
    for (const [mac, bridgePort] of macToPort) {
      if (seenMacs.has(mac)) continue;

      const BROADCAST = "ff:ff:ff:ff:ff:ff";
      const MULTICAST_PREFIX = "01:";
      if (mac === BROADCAST || mac.startsWith(MULTICAST_PREFIX)) continue;

      seenMacs.add(mac);

      const ifIndex = portToIfIndex.get(bridgePort);
      const ifName = ifIndex !== undefined ? ifIndexToName.get(ifIndex) ?? null : null;
      const vlanId = ifIndex !== undefined ? portToVlan.get(ifIndex) ?? null : null;
      const portStatus =
        ifIndex !== undefined
          ? (ifIndexToStatus.get(ifIndex) as "up" | "down") ?? "unknown"
          : "unknown";

      devices.push({
        macAddress: mac,
        ipAddress: macToIp.get(mac) ?? null,
        switchPort: ifName,
        vlanId,
        portStatus,
      });
    }

    logger.info(
      { host: cfg.host, devices: devices.length, errors: errors.length, durationMs: Date.now() - start },
      "SNMP poll completed"
    );
  } finally {
    session.close();
  }

  return {
    devices,
    interfaceCount: ifIndexToName.size,
    errors,
    durationMs: Date.now() - start,
  };
}
