import { BridgeBaseError } from "./BridgeBaseError";

/**
 * Raised when credential retrieval fails
 */
export class CredentialError extends BridgeBaseError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, details);
    Object.setPrototypeOf(this, CredentialError.prototype);
  }
}
