declare module "ldapts" {
  export interface SearchEntry {
    dn: string;
    [key: string]: string | string[] | Buffer | Buffer[] | undefined;
  }

  export interface SearchResult {
    searchEntries: SearchEntry[];
    searchReferences: string[];
  }

  export interface SearchOptions {
    scope?: "base" | "one" | "sub";
    filter?: string;
    attributes?: string[];
    sizeLimit?: number;
    paged?: { pageSize: number; pagePause?: boolean };
  }

  export interface ClientOptions {
    url: string;
    timeout?: number;
    connectTimeout?: number;
    tlsOptions?: Record<string, unknown>;
  }

  export class Client {
    constructor(options: ClientOptions);
    bind(dn: string, password: string): Promise<void>;
    unbind(): Promise<void>;
    search(base: string, options?: SearchOptions): Promise<SearchResult>;
    add(dn: string, entry: Record<string, unknown>): Promise<void>;
    modify(dn: string, changes: unknown[]): Promise<void>;
    del(dn: string): Promise<void>;
  }
}
