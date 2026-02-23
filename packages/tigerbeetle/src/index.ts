/**
 * @bridgebase/tigerbeetle - TigerBeetle adapter with BridgeBase gateway integration
 */

import { TigerBeetleSession, TigerBeetleSessionConfig, TigerBeetleClient } from "./sessions/TigerBeetleSession";
import { createTigerBeetleNamespace } from "./namespaces/TigerBeetleNamespace";

export interface TigerBeetleConnection {
  client: TigerBeetleClient;
  disconnect: () => Promise<void>;
}

/**
 * Convenience factory function for TigerBeetle
 * Creates and connects a session in one call
 */
export async function connectTigerBeetle(
  jwtToken: string,
  options?: Partial<TigerBeetleSessionConfig>
): Promise<TigerBeetleConnection> {
  const session = new TigerBeetleSession({
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
 * Factory function to create a session without auto-connecting
 */
export function createTigerBeetleSession(
  jwtToken: string,
  options?: Partial<TigerBeetleSessionConfig>
): TigerBeetleSession {
  return new TigerBeetleSession({
    jwtToken,
    ...options,
  });
}

/**
 * TigerBeetle namespace with dual callable + type access
 */
export const tigerbeetle = createTigerBeetleNamespace();

// Session exports
export { TigerBeetleSession };
export type { TigerBeetleSessionConfig, TigerBeetleClient } from "./sessions/TigerBeetleSession";

// Re-export all TigerBeetle types and functions for convenience
// Users can access all native tigerbeetle-node types without additional imports
export type {
  Client,
  Account,
  Transfer,
  AccountFilter,
  AccountBalance,
  QueryFilter,
  // Error result types (with 's' - these have index and result fields)
  CreateAccountsError,
  CreateTransfersError,
} from "tigerbeetle-node";

/**
 * Re-export enums as values so they can be used at runtime
 * (not just as types)
 */
export {
  AccountFlags,
  TransferFlags,
  AccountFilterFlags,
  QueryFilterFlags,
  // Error code enums (without 's' - these are the error codes)
  CreateAccountError,
  CreateTransferError,
  // Standalone functions
  id,
  // Constants
  amount_max,
} from "tigerbeetle-node";

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
export const version = "0.2.0";
