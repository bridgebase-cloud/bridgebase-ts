# BridgeBase Node.js SDK

A modular, production-grade SDK for securely accessing databases through BridgeBase infrastructure. Built with TypeScript, featuring minimal abstractions and native driver pass-through.

## ✨ Features

- ✅ **Modular Architecture** — Install only what you need via independent packages
- ✅ **Unified API** — Consistent interface across multiple database types  
- ✅ **Native Drivers** — Direct pass-through with minimal abstraction
- ✅ **Infrastructure Transparency** — Automatic gateway resolution and proxy management
- ✅ **Type Safety** — Full TypeScript support with proper type hierarchy
- ✅ **Exception Hierarchy** — Comprehensive, typed error handling
- ✅ **Async/Await** — Fully asynchronous with for-await-of support
- ✅ **Production-Ready** — Enterprise-grade infrastructure support

## 📦 Packages

This monorepo contains database adapters for BridgeBase:

| Package | Purpose | Status |
|---------|---------|--------|
| [`@bridgebase/core`](packages/core/) | Shared infrastructure (gateway, proxy, sessions) | ✅ Stable |
| [`@bridgebase/redis`](packages/redis/) | Redis adapter | ✅ Stable |
| [`@bridgebase/tigerbeetle`](packages/tigerbeetle/) | TigerBeetle (ledger) adapter | ✅ Stable |

## 🚀 Quick Start

### Redis

```bash
npm install @bridgebase/redis
```

```typescript
import { connectRedis } from "@bridgebase/redis";

const session = await connectRedis("your-jwt-token", { db: 0 });
const redis = session.client;

await redis.set("key", "value");
const value = await redis.get("key");
console.log(value);

await session.disconnect();
```

### TigerBeetle

```bash
npm install @bridgebase/tigerbeetle
```

```typescript
import { connectTigerBeetle, id, type Account } from "@bridgebase/tigerbeetle";

const session = await connectTigerBeetle("your-jwt-token", { clusterId: 0 });
const tb = session.client;

const account: Account = {
  id: id(),
  debits_pending: 0n,
  debits_posted: 0n,
  credits_pending: 0n,
  credits_posted: 0n,
  user_data_128: 0n,
  user_data_64: 0n,
  user_data_32: 0,
  reserved: 0,
  ledger: 1,
  code: 1,
  flags: 0,
  timestamp: 0n,
};

await tb.createAccounts([account]);

await session.disconnect();
```

## 📖 Documentation

- **[@bridgebase/core](packages/core/README.md)** - Core infrastructure
- **[@bridgebase/redis](packages/redis/README.md)** - Redis adapter
- **[@bridgebase/tigerbeetle](packages/tigerbeetle/README.md)** - TigerBeetle adapter

## 🔧 Installation

### Option 1: Individual Adapters (Recommended)

Install only what you need:

```bash
# Redis only
npm install @bridgebase/redis

# TigerBeetle only
npm install @bridgebase/tigerbeetle

# Both
npm install @bridgebase/redis @bridgebase/tigerbeetle
```

### Option 2: Core Package

For infrastructure access (typically not needed by end users):

```bash
npm install @bridgebase/core
```

## 🛠️ Usage Patterns

### Basic Pattern

```typescript
import { connectRedis } from \"@bridgebase/redis\";

async function main() {
  const session = await connectRedis(jwtToken, options);
  
  // Use client
  await session.client.set("key", "value");
  
  await session.disconnect();
}
```

### Error Handling

```typescript
import {
  connectTigerBeetle,
  id,
  AuthError,
  GatewayResolutionError,
  ConnectionError,
} from "@bridgebase/tigerbeetle";

try {
  const session = await connectTigerBeetle(token, { clusterId: 0 });
  const tb = session.client;
  
  const accountId = id();
  await tb.createAccounts([{
    id: accountId,
    // ... other required fields
  }]);
  
  await session.disconnect();
} catch (error) {
  if (error instanceof AuthError) {
    console.error("Authentication failed");
  } else if (error instanceof GatewayResolutionError) {
    console.error("Could not resolve gateway");
  } else if (error instanceof ConnectionError) {
    console.error("Connection failed");
  }
}
```

## 🏗️ Architecture

### Connection Flow

```
Application
    ↓
Session.connect(jwtToken)
    ↓
GatewayResolver.resolve()
    ↓
BridgeBase Control Plane (validates token)
    ↓
GatewayConnection.establish()
    ↓
Local TCP Proxy
    ↓
Native Client (Redis, TigerBeetle, etc.)
```

### Components

- **BaseSession** - Abstract base for all adapters
- **GatewayResolver** - Dynamic gateway discovery 
- **GatewayConnection** - JWT authentication & TCP connection
- **ProxyManager** - Local proxy lifecycle
- **Exception Hierarchy** - Typed error handling

## 📚 Exception Types

- `BridgeBaseError` — Base exception class
- `AuthError` — Authentication failures
- `GatewayError` — Gateway communication errors
  - `GatewayResolutionError` — Endpoint resolution failures
- `ConnectionError` — Database connection failures
- `CredentialError` — Credential retrieval failures
- `ProxyError` — Local proxy failures

## 🛠️ Development

### Setup

```bash
npm install
npm run build
```

### Build & Test

```bash
npm run build          # Compile all packages
npm run build:watch    # Watch mode
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run lint           # Lint code
npm run type-check     # Type checking
npm run clean          # Clean builds
```

### Workspaces Commands

```bash
# Build single package
npm run build -w @bridgebase/core
npm run build -w @bridgebase/redis

# Test single package
npm run test -w @bridgebase/tigerbeetle
```

## 📦 Project Structure

```
packages/
├── core/               # Shared infrastructure
│   ├── src/
│   │   ├── sessions/
│   │   ├── gateway/
│   │   ├── proxy/
│   │   ├── credentials/
│   │   ├── exceptions/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── tsup.config.ts
│
├── redis/              # Redis adapter
│   ├── src/
│   │   ├── sessions/
│   │   └── index.ts
│   ├── package.json
│   └── README.md
│
└── tigerbeetle/        # TigerBeetle adapter
    ├── src/
    │   ├── sessions/
    │   ├── namespaces/
    │   └── index.ts
    ├── package.json
    └── README.md
```

## 🔗 Related

- [BridgeBase Cloud](https://bridgebase.dev)
- [TigerBeetle Documentation](https://docs.tigerbeetle.com)
- [Redis Documentation](https://redis.io/documentation)

## 📄 License

MIT

---

**Version:** 0.2.0  
**Last Updated:** February 2026
