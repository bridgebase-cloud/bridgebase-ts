import axios, { AxiosInstance } from "axios";
import AsyncLock from "async-lock";

import {
  GatewayEndpoint,
  GatewayResolveResponse,
} from "./index";
import { GatewayResolutionError } from "../exceptions";
import {
  GATEWAY_RESOLVE_PATH,
  MAX_JWT_SIZE,
  HTTP_CLIENT_TIMEOUT,
} from "../constants";

/**
 * Resolves gateway endpoints from the control plane API
 */
export class GatewayResolver {
  private apiBaseUrl: string;
  private httpClient: AxiosInstance;
  private cached?: GatewayEndpoint;
  private cacheLock = new AsyncLock();

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: HTTP_CLIENT_TIMEOUT,
    });
  }

  /**
   * Resolve gateway endpoint from JWT token
   */
  async resolve(jwtToken: string): Promise<GatewayEndpoint> {
    // Return cached if available
    if (this.cached) {
      return this.cached;
    }

    // Validate JWT size
    if (jwtToken.length > MAX_JWT_SIZE) {
      throw new GatewayResolutionError(
        "JWT token exceeds maximum size",
        "JWT_SIZE_EXCEEDED"
      );
    }

    // POST /api/v1/gateway/resolve with JWT in bearer auth header
    try {
      const response = await this.httpClient.post<GatewayResolveResponse>(
        GATEWAY_RESOLVE_PATH,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      const { data } = response;
      const host = data.gateway_host || data.dns;
      const port = data.port;

      if (!host || !port) {
        throw new GatewayResolutionError(
          "Invalid gateway response: missing host or port",
          "INVALID_RESPONSE"
        );
      }

      this.cached = { host, port };
      return this.cached;
    } catch (error) {
      if (error instanceof GatewayResolutionError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new GatewayResolutionError(
        `Failed to resolve gateway: ${message}`,
        "RESOLUTION_FAILED",
        { originalError: error }
      );
    }
  }

  /**
   * Invalidate cached endpoint
   */
  invalidate(): void {
    this.cached = undefined;
  }
}
