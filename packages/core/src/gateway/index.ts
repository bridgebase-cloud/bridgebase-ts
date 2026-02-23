/**
 * Gateway endpoint information
 */
export interface GatewayEndpoint {
  host: string;
  port: number;
}

/**
 * Response from gateway resolution API
 */
export interface GatewayResolveResponse {
  dns?: string;           // Fallback field name
  gateway_host?: string;  // Primary field name
  port: number;
}

export { GatewayResolver } from "./GatewayResolver";
export { GatewayConnection } from "./GatewayConnection";
