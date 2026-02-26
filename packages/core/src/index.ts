/**
 * @bridgebase/core - Shared session management, gateway resolution, and proxy lifecycle
 */

// Exception exports
export {
  BridgeBaseError,
  AuthError,
  GatewayError,
  GatewayResolutionError,
  ConnectionError,
  CredentialError,
  ProxyError,
} from "./exceptions";

// Session exports
export { BaseSession } from "./sessions/BaseSession";

// Type exports
export type { SessionConfig, DatabaseCredentials } from "./types";

// Gateway exports
export type { GatewayEndpoint, GatewayResolveResponse } from "./gateway";

// Proxy exports
export type { ProxyConfig } from "./proxy";

// Constants
export {
  DEFAULT_API_BASE_URL,
  GATEWAY_RESOLVE_PATH,
  MAX_JWT_SIZE,
  JWT_HANDSHAKE_TIMEOUT,
} from "./constants";

/**
 * SDK version
 */
export const version = "0.2.1";
