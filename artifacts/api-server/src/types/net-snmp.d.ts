declare module "net-snmp" {
  export const Version1: number;
  export const Version2c: number;
  export const Version3: number;

  export const AuthProtocols: {
    none: number;
    md5: number;
    sha: number;
    sha224: number;
    sha256: number;
    sha384: number;
    sha512: number;
  };

  export const PrivProtocols: {
    none: number;
    des: number;
    aes: number;
    aes256b: number;
    aes256r: number;
  };

  export const SecurityLevel: {
    noAuthNoPriv: number;
    authNoPriv: number;
    authPriv: number;
  };

  export interface Varbind {
    oid: string;
    type: number;
    value: Buffer | string | number | null;
  }

  export interface SessionOptions {
    port?: number;
    retries?: number;
    timeout?: number;
    transport?: string;
    trapPort?: number;
    version?: number;
    backwardsGetNexts?: boolean;
    idBitsSize?: number;
  }

  export interface User {
    name: string;
    level: number;
    authProtocol?: number;
    authKey?: string;
    privProtocol?: number;
    privKey?: string;
  }

  export interface Session {
    get(oids: string[], callback: (error: Error | null, varbinds: Varbind[]) => void): void;
    getNext(oids: string[], callback: (error: Error | null, varbinds: Varbind[]) => void): void;
    set(varbinds: Varbind[], callback: (error: Error | null, varbinds: Varbind[]) => void): void;
    subtree(
      oid: string,
      maxRepetitions: number,
      feedCallback: (varbinds: Varbind[]) => void,
      doneCallback: (error: Error | null) => void
    ): void;
    table(
      oid: string,
      maxRepetitions: number,
      callback: (error: Error | null, table: Record<string, Record<string, unknown>>) => void
    ): void;
    close(): void;
  }

  export function createSession(target: string, community: string, options?: SessionOptions): Session;
  export function createV3Session(target: string, user: User, options?: SessionOptions): Session;
  export function isVarbindError(varbind: Varbind): boolean;
  export function varbindError(varbind: Varbind): Error;
}

declare module "node-cron" {
  export interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }

  export interface Task {
    start(): void;
    stop(): void;
    destroy(): void;
    getStatus(): string;
  }

  export function schedule(
    expression: string,
    func: () => void | Promise<void>,
    options?: ScheduleOptions
  ): Task;

  export function validate(expression: string): boolean;
}
