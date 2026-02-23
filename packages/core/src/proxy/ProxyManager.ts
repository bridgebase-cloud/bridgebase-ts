import net from "net";

import { GatewayConnection } from "../gateway";
import { ProxyError } from "../exceptions";
import {
  DEFAULT_PROXY_TIMEOUT,
  DEFAULT_PROXY_BUFFER_SIZE,
} from "../constants";

export interface ProxyConfig {
  timeout?: number;
  bufferSize?: number;
}

/**
 * Local TCP proxy that forwards client connections to gateway
 */
export class ProxyManager {
  private server?: net.Server;
  private gatewayConnection?: GatewayConnection;
  private port: number = 0;
  private connections: Set<net.Socket> = new Set();
  private running: boolean = false;
  private timeout: number;
  private bufferSize: number;

  constructor(config: ProxyConfig = {}) {
    this.timeout = config.timeout ?? DEFAULT_PROXY_TIMEOUT;
    this.bufferSize = config.bufferSize ?? DEFAULT_PROXY_BUFFER_SIZE;
  }

  /**
   * Start the proxy server
   */
  async start(
    gatewayConnection: GatewayConnection,
    assignedPort?: number
  ): Promise<number> {
    if (this.running) {
      return this.port;
    }

    this.gatewayConnection = gatewayConnection;

    return new Promise((resolve, reject) => {
      this.server = net.createServer((clientSocket) => {
        this.handleClientConnection(clientSocket);
      });

      this.server.on("error", (err) => {
        reject(
          new ProxyError(
            `Server error: ${err.message}`,
            "SERVER_ERROR"
          )
        );
      });

      this.server.listen(assignedPort ?? 0, "127.0.0.1", () => {
        this.port = (this.server!.address() as net.AddressInfo).port;
        this.running = true;
        resolve(this.port);
      });
    });
  }

  /**
   * Handle incoming client connection
   */
  private handleClientConnection(clientSocket: net.Socket): void {
    this.connections.add(clientSocket);

    clientSocket.on("data", async (data) => {
      try {
        await this.gatewayConnection!.write(data);
        const response = await this.gatewayConnection!.read();
        clientSocket.write(response);
      } catch (error) {
        clientSocket.destroy();
      }
    });

    clientSocket.on("error", () => {
      this.connections.delete(clientSocket);
    });

    clientSocket.on("close", () => {
      this.connections.delete(clientSocket);
    });

    clientSocket.on("timeout", () => {
      clientSocket.destroy();
    });

    clientSocket.setTimeout(this.timeout);
  }

  /**
   * Stop the proxy server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.running) {
        resolve();
        return;
      }

      // Close all client connections
      for (const conn of this.connections) {
        conn.destroy();
      }
      this.connections.clear();

      // Close server
      this.server!.close(() => {
        this.running = false;
        this.port = 0;
        resolve();
      });
    });
  }

  /**
   * Check if proxy is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the assigned port
   */
  getPort(): number {
    return this.port;
  }
}
