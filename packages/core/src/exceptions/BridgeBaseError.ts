/**
 * Base exception class for all BridgeBase SDK errors.
 */
export class BridgeBaseError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, BridgeBaseError.prototype);
  }
}
