/**
 * Database credentials (username and password)
 */
export interface DatabaseCredentials {
  username: string;
  password: string;
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  jwtToken: string;
  apiBaseUrl?: string;
  db?: number;              // Redis only
  database?: string;        // SQL only
}
