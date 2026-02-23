import { BridgeBaseError } from "./BridgeBaseError";

/**
 * Raised when authentication fails (JWT invalid, expired, etc.)
 */
export class AuthError extends BridgeBaseError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
