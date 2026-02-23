import net from "net";

import { GatewayEndpoint } from "./index";
import { GatewayError } from "../exceptions";
import { JWT_HANDSHAKE_TIMEOUT } from "../constants";

/**
 * Manages TCP connection to gateway with JWT handshake
 */
export class GatewayConnection {
  private endpoint: GatewayEndpoint;
  private socket?: net.Socket;
  private authenticated: boolean = false;

  constructor(endpoint: GatewayEndpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Authenticate with gateway using JWT token
   */
  async authenticate(jwtToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = net.createConnection({
          host: this.endpoint.host,
          port: this.endpoint.port,
          timeout: JWT_HANDSHAKE_TIMEOUT,
        });

        this.socket.on("connect", () => {
          // Send JWT handshake: [4 byte length] + [token]
          const tokenBuffer = Buffer.from(jwtToken, "utf-8");
          const lengthBuffer = Buffer.alloc(4);
          lengthBuffer.writeUInt32BE(tokenBuffer.length, 0);

          const handshakeBuffer = Buffer.concat([
            lengthBuffer,
            tokenBuffer,
          ]);

          this.socket!.write(handshakeBuffer, (err) => {
            if (err) {
              this.socket!.destroy();
              reject(
                new GatewayError(
                  `Handshake write failed: ${err.message}`,
                  "HANDSHAKE_FAILED"
                )
              );
            } else {
              this.authenticated = true;
              resolve();
            }
          });
        });

        this.socket.on("error", (err) => {
          reject(
            new GatewayError(
              `Connection error: ${err.message}`,
              "CONNECTION_ERROR"
            )
          );
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        reject(
          new GatewayError(
            `Failed to authenticate: ${message}`,
            "AUTH_FAILED"
          )
        );
      }
    });
  }

  /**
   * Write data to gateway
   */
  write(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.authenticated) {
        reject(new GatewayError("Not connected", "NOT_CONNECTED"));
        return;
      }

      this.socket.write(data, (err) => {
        if (err) {
          reject(
            new GatewayError(`Write failed: ${err.message}`, "WRITE_FAILED")
          );
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Read data from gateway
   */
  read(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.authenticated) {
        reject(new GatewayError("Not connected", "NOT_CONNECTED"));
        return;
      }

      const onData = (data: Buffer) => {
        cleanup();
        resolve(data);
      };

      const onError = (err: Error) => {
        cleanup();
        reject(
          new GatewayError(`Read failed: ${err.message}`, "READ_FAILED")
        );
      };

      const cleanup = () => {
        this.socket!.removeListener("data", onData);
        this.socket!.removeListener("error", onError);
      };

      this.socket.once("data", onData);
      this.socket.once("error", onError);
    });
  }

  /**
   * Close gateway connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve();
        return;
      }

      this.socket.destroy();
      this.authenticated = false;
      resolve();
    });
  }
}
