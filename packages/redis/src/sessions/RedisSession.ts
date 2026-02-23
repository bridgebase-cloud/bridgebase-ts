import { BaseSession, DatabaseCredentials, SessionConfig, ConnectionError } from "@bridgebase/core";
import type { RedisClientType } from "redis";

export interface RedisSessionConfig extends SessionConfig {
  db?: number;
}

/**
 * Session adapter for Redis database
 * Provides full access to node-redis client methods
 */
export class RedisSession extends BaseSession<RedisClientType> {
  private db: number;

  constructor(config: RedisSessionConfig) {
    super(config);
    this.db = config.db ?? 0;
    this.dbType = "redis";
  }

  /**
   * Access native Redis client
   * Must call connect() first
   * 
   * All redis (node-redis) client methods are available:
   * - Basic commands: get, set, del, exists, etc.
   * - Hashes: hSet, hGet, hGetAll, hDel, etc.
   * - Lists: lPush, rPush, lPop, rPop, lRange, etc.
   * - Sets: sAdd, sRem, sMembers, etc.
   * - Sorted Sets: zAdd, zRem, zRange, zScore, etc.
   * - Pub/Sub: publish, subscribe, unsubscribe, etc.
   * - Transactions: multi, exec, etc.
   * - And many more...
   */
  get client(): RedisClientType {
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
    proxyPort: number,
  ): Promise<RedisClientType> {
    try {
      // Lazy import redis
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const redis = require("redis");

      const client = redis.createClient({
        socket: {
          host: "127.0.0.1",
          port: proxyPort,
        },
        database: this.db,
      });

      await client.connect();
      return client;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ConnectionError(
        `Failed to connect to Redis: ${message}`,
        "REDIS_CONNECT_FAILED",
        { originalError: error },
      );
    }
  }

  protected async closeNative(nativeClient: RedisClientType): Promise<void> {
    if (nativeClient && typeof nativeClient.quit === "function") {
      await nativeClient.quit();
    } else if (nativeClient && typeof nativeClient.disconnect === "function") {
      await nativeClient.disconnect();
    }
  }

  protected get requiresCredentials(): boolean {
    return false;
  }

  protected get dbLabel(): string {
    return "Redis";
  }
}
