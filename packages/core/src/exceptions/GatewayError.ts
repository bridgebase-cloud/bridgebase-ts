import { BridgeBaseError } from "./BridgeBaseError";

/**
 * Raised for gateway-related errors (connection, protocol, etc.)
 */
export class GatewayError extends BridgeBaseError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, GatewayError.prototype);
  }
}

/**
 * Raised when gateway endpoint resolution fails
 */
export class GatewayResolutionError extends GatewayError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, GatewayResolutionError.prototype);
  }
}
