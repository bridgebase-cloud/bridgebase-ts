import { BridgeBaseError } from "./BridgeBaseError";

/**
 * Raised when connection to database fails
 */
export class ConnectionError extends BridgeBaseError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}
