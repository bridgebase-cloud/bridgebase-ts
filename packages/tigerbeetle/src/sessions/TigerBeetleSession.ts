import { BaseSession, DatabaseCredentials, SessionConfig, ConnectionError } from "@bridgebase/core";
import type { Client } from "tigerbeetle-node";

export interface TigerBeetleSessionConfig extends SessionConfig {
  clusterId?: number;
  /**
   * Maximum number of concurrent operations
   * @default 32
   */
  concurrencyMax?: number;
}

/**
 * Re-export TigerBeetle Client type for convenience
 */
export type TigerBeetleClient = Client;

/**
 * Session adapter for TigerBeetle database
 * Provides full access to tigerbeetle-node Client methods
 */
export class TigerBeetleSession extends BaseSession<Client> {
  private clusterId: number;
  private concurrencyMax: number;

  constructor(config: TigerBeetleSessionConfig) {
    super(config);
    this.clusterId = config.clusterId ?? 0;
    this.concurrencyMax = config.concurrencyMax ?? 32;
    this.dbType = "tigerbeetle";
  }

  /**
   * Access native TigerBeetle client
   * Must call connect() first
   * 
   * All tigerbeetle-node Client methods are available:
   * - createAccounts(accounts: Account[]): Promise<CreateAccountsError[]>
   * - createTransfers(transfers: Transfer[]): Promise<CreateTransfersError[]>
   * - lookupAccounts(ids: bigint[]): Promise<Account[]>
   * - lookupTransfers(ids: bigint[]): Promise<Transfer[]>
   * - getAccountTransfers(filter: AccountFilter): Promise<Transfer[]>
   * - getAccountBalances(filter: AccountFilter): Promise<AccountBalance[]>
   * - id(): bigint
   * - destroy(): void
   */
  get client(): Client {
    if (!this.nativeClient) {
      throw new ConnectionError(
        "Session not connected. Call connect() first.",
        "SESSION_NOT_CONNECTED"
      );
    }
    return this.nativeClient;
  }

  protected async connectNative(
    credentials: DatabaseCredentials | null,
    proxyPort: number
  ): Promise<Client> {
    try {
      // Lazy import tigerbeetle-node to avoid bundling if not used
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require("tigerbeetle-node");

      const client = createClient({
        cluster_id: BigInt(this.clusterId),
        replica_addresses: [`127.0.0.1:${proxyPort}`],
        concurrency_max: this.concurrencyMax,
      });
      
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ConnectionError(
        `Failed to connect to TigerBeetle: ${message}`,
        "TIGERBEETLE_CONNECT_FAILED",
        { originalError: error }
      );
    }
  }

  protected async closeNative(nativeClient: Client): Promise<void> {
    // TigerBeetle client.destroy() is synchronous, not async
    if (nativeClient && typeof nativeClient.destroy === "function") {
      nativeClient.destroy();
    }
  }

  protected get requiresCredentials(): boolean {
    return false;
  }

  protected get dbLabel(): string {
    return "TigerBeetle";
  }
}
