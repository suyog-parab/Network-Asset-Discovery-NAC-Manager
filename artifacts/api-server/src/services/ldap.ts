import { logger } from "../lib/logger";

export interface LdapComputerEntry {
  cn: string;
  dnsHostName: string | null;
  operatingSystem: string | null;
  operatingSystemVersion: string | null;
  department: string | null;
  distinguishedName: string;
  lastLogon: Date | null;
  userAccountControl: number | null;
}

export interface LdapSyncResult {
  computers: LdapComputerEntry[];
  errors: string[];
  durationMs: number;
  highestCommittedUSN?: string;
}

export interface LdapConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  serverInfo?: string;
  baseDN?: string;
}

function fileTimeToDate(fileTime: string | bigint | null): Date | null {
  if (!fileTime) return null;
  try {
    const ft = BigInt(fileTime.toString());
    if (ft === 0n) return null;
    const epochOffset = 116444736000000000n;
    const unixMs = (ft - epochOffset) / 10000n;
    return new Date(Number(unixMs));
  } catch { return null; }
}

export async function testLdapConnection(
  url: string,
  bindDN: string,
  bindPassword: string
): Promise<LdapConnectionTestResult> {
  const start = Date.now();
  let client: unknown = null;

  try {
    const { Client } = await import("ldapts");

    const ldapClient = new Client({ url, timeout: 10000, connectTimeout: 8000 });
    client = ldapClient;

    await ldapClient.bind(bindDN, bindPassword);

    const { searchEntries } = await ldapClient.search("", {
      scope: "base",
      filter: "(objectClass=*)",
      attributes: ["defaultNamingContext", "dnsHostName", "highestCommittedUSN"],
    });

    const entry = searchEntries[0] as Record<string, unknown>;
    const baseDN = entry?.defaultNamingContext?.toString() ?? "unknown";
    const serverDns = entry?.dnsHostName?.toString() ?? url;

    await ldapClient.unbind();

    return {
      success: true,
      latencyMs: Date.now() - start,
      serverInfo: `Connected to ${serverDns}, base DN: ${baseDN}`,
      baseDN,
    };
  } catch (err) {
    if (client && typeof client === "object" && "unbind" in client) {
      try { await (client as { unbind: () => Promise<void> }).unbind(); } catch { }
    }
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function syncActiveDirectory(
  url: string,
  bindDN: string,
  bindPassword: string,
  baseDN: string,
  lastHighestUSN?: string
): Promise<LdapSyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  const computers: LdapComputerEntry[] = [];
  let client: unknown = null;

  try {
    const { Client } = await import("ldapts");

    const ldapClient = new Client({ url, timeout: 30000, connectTimeout: 15000 });
    client = ldapClient;

    await ldapClient.bind(bindDN, bindPassword);
    logger.info({ url, baseDN }, "LDAP bind successful");

    const filter = lastHighestUSN
      ? `(&(objectClass=computer)(uSNChanged>=${lastHighestUSN}))`
      : "(objectClass=computer)";

    const { searchEntries } = await ldapClient.search(baseDN, {
      scope: "sub",
      filter,
      attributes: [
        "cn",
        "dNSHostName",
        "operatingSystem",
        "operatingSystemVersion",
        "department",
        "distinguishedName",
        "lastLogon",
        "lastLogonTimestamp",
        "userAccountControl",
        "uSNChanged",
      ],
      paged: { pageSize: 500 },
    });

    logger.info({ count: searchEntries.length, baseDN }, "LDAP computer objects retrieved");

    let maxUSN = lastHighestUSN ?? "0";

    for (const entry of searchEntries) {
      const e = entry as Record<string, unknown>;

      const usnChanged = e.uSNChanged?.toString() ?? "0";
      if (BigInt(usnChanged) > BigInt(maxUSN)) maxUSN = usnChanged;

      const lastLogonRaw = e.lastLogonTimestamp ?? e.lastLogon ?? null;
      const lastLogon = fileTimeToDate(lastLogonRaw as string | null);

      computers.push({
        cn: e.cn?.toString() ?? "",
        dnsHostName: e.dNSHostName?.toString() ?? null,
        operatingSystem: e.operatingSystem?.toString() ?? null,
        operatingSystemVersion: e.operatingSystemVersion?.toString() ?? null,
        department: e.department?.toString() ?? null,
        distinguishedName: e.distinguishedName?.toString() ?? "",
        lastLogon,
        userAccountControl: e.userAccountControl ? parseInt(e.userAccountControl.toString(), 10) : null,
      });
    }

    const rootResult = await ldapClient.search("", {
      scope: "base",
      filter: "(objectClass=*)",
      attributes: ["highestCommittedUSN"],
    });

    const rootEntry = rootResult.searchEntries[0] as Record<string, unknown>;
    const highestCommittedUSN = rootEntry?.highestCommittedUSN?.toString() ?? maxUSN;

    await ldapClient.unbind();

    logger.info(
      { computers: computers.length, highestCommittedUSN, durationMs: Date.now() - start },
      "AD sync complete"
    );

    return { computers, errors, durationMs: Date.now() - start, highestCommittedUSN };
  } catch (err) {
    if (client && typeof client === "object" && "unbind" in client) {
      try { await (client as { unbind: () => Promise<void> }).unbind(); } catch { }
    }
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    logger.error({ url, baseDN, err }, "AD sync failed");
    return { computers: [], errors, durationMs: Date.now() - start };
  }
}

export async function correlateAdToDevices(
  computers: LdapComputerEntry[],
  devices: Array<{ macAddress: string; hostname: string | null; department: string | null; operatingSystem: string | null }>
): Promise<Map<string, Partial<LdapComputerEntry>>> {
  const enrichMap = new Map<string, Partial<LdapComputerEntry>>();

  for (const device of devices) {
    const hostname = device.hostname?.toLowerCase();
    if (!hostname) continue;

    const match = computers.find((c) => {
      const cn = c.cn.toLowerCase();
      const dns = c.dnsHostName?.toLowerCase().split(".")[0] ?? null;
      return cn === hostname || dns === hostname;
    });

    if (match) {
      enrichMap.set(device.macAddress, {
        department: match.department,
        operatingSystem: match.operatingSystem,
        operatingSystemVersion: match.operatingSystemVersion,
        lastLogon: match.lastLogon,
        dnsHostName: match.dnsHostName,
      });
    }
  }

  return enrichMap;
}
