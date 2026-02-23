import { EventEmitter } from "events";
import AsyncLock from "async-lock";

import { SessionConfig, DatabaseCredentials } from "../types";
import { GatewayResolver } from "../gateway/GatewayResolver";
import { GatewayConnection } from "../gateway/GatewayConnection";
import { ProxyManager } from "../proxy/ProxyManager";
import { CredentialClient } from "../credentials/CredentialClient";
import { ConnectionError } from "../exceptions";
import { DEFAULT_API_BASE_URL } from "../constants";

/**
 * Base session class - orchestrates infrastructure and provides lifecycle
 */
export abstract class BaseSession<T> extends EventEmitter {
  protected jwtToken: string;
  protected apiBaseUrl: string;
  protected database?: string;
  protected dbType?: string;

  protected resolver: GatewayResolver;
  protected credentialClient: CredentialClient;
  protected gatewayConn?: GatewayConnection;
  protected proxy: ProxyManager;
  protected credentials?: DatabaseCredentials;
  protected nativeClient?: T;

  protected initialized: boolean = false;
  protected closed: boolean = false;
  protected lock: AsyncLock = new AsyncLock();

  constructor(config: SessionConfig) {
    super();
    this.jwtToken = config.jwtToken;
    this.apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    this.database = config.database;

    this.resolver = new GatewayResolver(this.apiBaseUrl);
    this.credentialClient = new CredentialClient(this.apiBaseUrl);
    this.proxy = new ProxyManager();
  }

  /**
   * Connect to database and set up infrastructure
   */
  async connect(): Promise<T> {
    return this.lock.acquire("connect", async () => {
      if (this.initialized) {
        if (this.closed) {
          throw new ConnectionError(
            "Session has been closed",
            "SESSION_CLOSED"
          );
        }
        return this.nativeClient!;
      }

      try {
        // 1. Resolve gateway endpoint
        const endpoint = await this.resolver.resolve(this.jwtToken);

        // 2. Open gateway connection with JWT handshake
        this.gatewayConn = new GatewayConnection(endpoint);
        await this.gatewayConn.authenticate(this.jwtToken);

        // 3. Fetch credentials if needed
        if (this.requiresCredentials && this.database && this.dbType) {
          this.credentials = await this.credentialClient.fetch(
            this.jwtToken,
            this.database,
            this.dbType
          );
        }

        // 4. Start local proxy
        const proxyPort = await this.proxy.start(this.gatewayConn);

        // 5. Connect native driver
        this.nativeClient = await this.connectNative(
          this.credentials ?? null,
          proxyPort
        );

        this.initialized = true;
        this.emit("connected");

        return this.nativeClient;
      } catch (error) {
        // Cleanup on failure
        if (this.gatewayConn) {
          await this.gatewayConn.close();
        }
        if (this.proxy.isRunning()) {
          await this.proxy.stop();
        }

        const message = error instanceof Error ? error.message : String(error);
        throw new ConnectionError(
          `Failed to connect: ${message}`,
          "CONNECT_FAILED",
          { originalError: error }
        );
      }
    });
  }

  /**
   * Close session and clean up infrastructure
   */
  async close(): Promise<void> {
    return this.lock.acquire("close", async () => {
      if (this.closed) {
        return;
      }

      try {
        // 1. Close native client
        if (this.nativeClient) {
          await this.closeNative(this.nativeClient);
        }

        // 2. Stop proxy
        if (this.proxy.isRunning()) {
          await this.proxy.stop();
        }

        // 3. Close gateway connection
        if (this.gatewayConn) {
          await this.gatewayConn.close();
        }

        this.closed = true;
        this.emit("closed");
      } catch (error) {
        this.emit("error", error);
        throw error;
      }
    });
  }

  /**
   * Disconnect - alias for close() for better API consistency
   */
  async disconnect(): Promise<void> {
    return this.close();
  }

  /**
   * Abstract hook: connect to native database
   */
  protected abstract connectNative(
    credentials: DatabaseCredentials | null,
    proxyPort: number
  ): Promise<T>;

  /**
   * Abstract hook: close native database connection
   */
  protected abstract closeNative(nativeClient: T): Promise<void>;

  /**
   * Whether this session requires database credentials
   */
  protected get requiresCredentials(): boolean {
    return true;
  }

  /**
   * Human-readable database label
   */
  protected get dbLabel(): string {
    return "unknown";
  }

  /**
   * Async iterable for for-await-of pattern
   */
  async *[Symbol.asyncIterator]() {
    const client = await this.connect();
    try {
      yield client;
    } finally {
      await this.close();
    }
  }
}
