/**
 * @bridgebase/redis - Redis adapter with BridgeBase gateway integration
 */

import { RedisSession, RedisSessionConfig } from "./sessions/RedisSession";
import type { RedisClientType } from "redis";

export interface RedisConnection {
  client: RedisClientType;
  disconnect: () => Promise<void>;
}

/**
 * Convenience factory function for Redis
 * Creates and connects a session in one call
 */
export async function connectRedis(
  jwtToken: string,
  options?: Partial<RedisSessionConfig>
): Promise<RedisConnection> {
  const session = new RedisSession({
    jwtToken,
    ...options,
  });
  await session.connect();
  return {
    client: session.client,
    disconnect: () => session.disconnect(),
  };
}

/**
 * Alias for connectRedis
 */
export async function redis(
  jwtToken: string,
  options?: Partial<RedisSessionConfig>
): Promise<RedisConnection> {
  return connectRedis(jwtToken, options);
}

/**
 * Factory function to create a session without auto-connecting
 */
export function createRedisSession(
  jwtToken: string,
  options?: Partial<RedisSessionConfig>
): RedisSession {
  return new RedisSession({
    jwtToken,
    ...options,
  });
}

// Session exports
export { RedisSession };
export type { RedisSessionConfig } from "./sessions/RedisSession";

// Re-export commonly used Redis types for convenience
export type { RedisClientType } from "redis";

// Re-export core types and exceptions
export {
  BridgeBaseError,
  AuthError,
  GatewayError,
  GatewayResolutionError,
  ConnectionError,
  CredentialError,
  ProxyError,
} from "@bridgebase/core";

export type { SessionConfig, DatabaseCredentials } from "@bridgebase/core";

/**
 * SDK version
 */
export const version = "0.2.1";
