import {
  TigerBeetleSession,
  TigerBeetleSessionConfig,
} from "../sessions/TigerBeetleSession";

/**
 * Namespace for TigerBeetle - factory and type re-exporter combined
 */
class TigerBeetleNamespace {
  private nativeModule: Record<string, unknown> | null;

  constructor() {
    // Lazy-load native module
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.nativeModule = require("tigerbeetle-node");
    } catch {
      this.nativeModule = null;
    }
  }

  /**
   * Make the namespace callable as a factory
   */
  __call__(config: TigerBeetleSessionConfig): TigerBeetleSession {
    return new TigerBeetleSession(config);
  }

  /**
   * Forward property access to native module for types
   */
  __getattr__(name: string): unknown {
    if (!this.nativeModule) {
      throw new Error(
        "tigerbeetle-node not installed. Install with: npm install tigerbeetle-node"
      );
    }
    return this.nativeModule[name];
  }

  /**
   * For IDE autocompletion and introspection
   */
  __dir__(): string[] {
    if (!this.nativeModule) {
      return [];
    }
    return Object.keys(this.nativeModule);
  }
}

/**
 * Create TigerBeetle namespace wrapped in ES6 Proxy
 */
type TigerBeetleNamespaceProxy = (
  (jwtToken: string, options?: Partial<TigerBeetleSessionConfig>) => TigerBeetleSession
) & Record<string, unknown>;

export function createTigerBeetleNamespace(): TigerBeetleNamespaceProxy {
  const namespace = new TigerBeetleNamespace();

  return new Proxy(
    (jwtToken: string, options?: Partial<TigerBeetleSessionConfig>) => {
      return namespace.__call__({
        jwtToken,
        ...options,
      });
    },
    {
      get: (_target, prop: string | symbol) => {
        // Handle symbols
        if (typeof prop === "symbol") {
          return undefined;
        }
        // Handle string properties
        if (prop === "constructor") {
          return undefined;
        }
        if (typeof prop === "string" && prop in namespace) {
          return namespace[prop as keyof TigerBeetleNamespace];
        }
        if (typeof prop === "string") {
          return namespace.__getattr__(prop);
        }
        return undefined;
      },

      has: (_target, prop: string | symbol) => {
        return typeof prop === "string" && prop in namespace;
      },

      ownKeys: (_target) => {
        return namespace.__dir__();
      },

      getOwnPropertyDescriptor: (_target, prop: string | symbol) => {
        if (typeof prop === "string") {
          return {
            configurable: true,
            enumerable: namespace.__dir__().includes(prop),
          };
        }
        return undefined;
      },
    }
  ) as TigerBeetleNamespaceProxy;
}
