import { BridgeBaseError } from "./BridgeBaseError";

/**
 * Raised when local proxy fails
 */
export class ProxyError extends BridgeBaseError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, ProxyError.prototype);
  }
}
