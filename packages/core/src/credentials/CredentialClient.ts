import axios, { AxiosInstance } from "axios";

import { DatabaseCredentials } from "../types";
import { CredentialError } from "../exceptions";
import { HTTP_CLIENT_TIMEOUT } from "../constants";

/**
 * Fetches database credentials from control plane
 */
export class CredentialClient {
  private apiBaseUrl: string;
  private httpClient: AxiosInstance;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    this.httpClient = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: HTTP_CLIENT_TIMEOUT,
    });
  }

  /**
   * Fetch credentials for a database
   */
  async fetch(
    jwtToken: string,
    database: string,
    dbType: string
  ): Promise<DatabaseCredentials> {
    try {
      const response = await this.httpClient.post<DatabaseCredentials>(
        `/api/v1/credentials/${database}`,
        { type: dbType },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      const { data } = response;
      if (!data.username || !data.password) {
        throw new CredentialError(
          "Invalid credentials response: missing username or password",
          "INVALID_RESPONSE"
        );
      }

      return data;
    } catch (error) {
      if (error instanceof CredentialError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new CredentialError(
        `Failed to fetch credentials: ${message}`,
        "FETCH_FAILED",
        { originalError: error }
      );
    }
  }
}
