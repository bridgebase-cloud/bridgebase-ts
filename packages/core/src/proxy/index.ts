export interface ProxyConfig {
  timeout?: number;      // ms; default 30000
  bufferSize?: number;   // default 64KB
}

export { ProxyManager } from "./ProxyManager";
