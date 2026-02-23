# @bridgebase/core

Core BridgeBase SDK - Shared session management, gateway resolution, and proxy lifecycle.

## Features

- **Session Management** - Base session orchestration for all database types
- **Gateway Resolution** - Dynamic gateway discovery with JWT authentication
- **Local Proxy Management** - TCP proxy lifecycle and routing
- **Exception Hierarchy** - Comprehensive error handling
- **Type Safety** - Full TypeScript support

## Installation

```bash
npm install @bridgebase/core
```

## Usage

```typescript
import {
  BaseSession,
  GatewayResolutionError,
  ConnectionError,
} from "@bridgebase/core";

// Core is typically used by adapter packages, not directly by users
// See @bridgebase/redis or @bridgebase/tigerbeetle for user-facing APIs
```

## Architecture

### Components

1. **BaseSession** - Abstract base for all session implementations
2. **GatewayResolver** - Resolves database gateway from control plane
3. **GatewayConnection** - Manages TCP connection with JWT authentication
4. **ProxyManager** - Local proxy lifecycle and port allocation
5. **Exception Hierarchy** - Typed error handling

### Connection Flow

```
Application
    ↓
Session.connect()
    ↓
GatewayResolver.resolve(JWT)
    ↓
BridgeBase Control Plane (validates token, returns gateway address)
    ↓
GatewayConnection.establish()
    ↓
Local Proxy (TCP tunneling to remote database)
    ↓
connectNative() (adapter-specific, e.g., Redis client)
    ↓
Native Client Ready
```

## Error Handling

```typescript
import {
  AuthError,
  GatewayResolutionError,
  ConnectionError,
  ProxyError,
} from "@bridgebase/core";

try {
  const session = new SomeSession(config);
  await session.connect();
} catch (error) {
  if (error instanceof AuthError) {
    console.error("Authentication failed");
  } else if (error instanceof GatewayResolutionError) {
    console.error("Gateway resolution failed");
  } else if (error instanceof ConnectionError) {
    console.error("Connection failed");
  }
}
```

## License

MIT
