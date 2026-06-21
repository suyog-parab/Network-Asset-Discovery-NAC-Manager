declare module "ssh2" {
  import { EventEmitter } from "events";
  import { Readable } from "stream";

  interface ConnectConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: Buffer | string;
    passphrase?: string;
    readyTimeout?: number;
    keepaliveInterval?: number;
    debug?: (message: string) => void;
  }

  interface Channel extends Readable {
    stdin: NodeJS.WritableStream;
    stdout: Readable;
    stderr: Readable;
    write(data: string | Buffer): boolean;
    end(): void;
    on(event: "close", listener: (code: number | null, signal: string | null) => void): this;
    on(event: "data", listener: (data: Buffer) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  class Client extends EventEmitter {
    connect(config: ConnectConfig): void;
    exec(command: string, callback: (err: Error | undefined, channel: Channel) => void): void;
    exec(command: string, options: object, callback: (err: Error | undefined, channel: Channel) => void): void;
    end(): void;
    on(event: "ready", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export { Client, ConnectConfig, Channel };
}
