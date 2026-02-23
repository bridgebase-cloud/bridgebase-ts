# @bridgebase/redis

Redis adapter for BridgeBase - Native Redis client with gateway integration.

## Features

- **Minimal Abstraction** - Direct pass-through to native Redis client
- **Gateway Integration** - Automatic proxy tunnel setup via BridgeBase
- **Full Redis Support** - Access to all Redis commands and options
- **Connection Pooling** - Leverage Redis client connection management

## Installation

```bash
npm install @bridgebase/redis redis
```

## Quick Start

```typescript
import { connectRedis } from "@bridgebase/redis";

const session = await connectRedis("your-jwt-token", { db: 0 });
const redis = session.client; // Access native Redis client

// Use native Redis client
await redis.set("key", "value");
const value = await redis.get("key");
console.log(value);

await session.disconnect();
```

## Factory Functions

### connectRedis()

Creates a session and automatically connects:

```typescript
const session = await connectRedis(jwtToken, {
  db?: number;           // Redis database number (default: 0)
  apiBaseUrl?: string;   // BridgeBase API endpoint
});

const redis = session.client; // Native Redis client
```

### redis()

Alias for `connectRedis()`:

```typescript
const session = await redis(jwtToken, options);
```

### createRedisSession()

Creates a session without auto-connecting:

```typescript
const session = createRedisSession(jwtToken, options);
const redis = await session.connect(); // Manual connect
```

## Using Native Redis Client

Once connected, you have full access to the native Redis client:

```typescript
import { connectRedis } from "@bridgebase/redis";

const session = await connectRedis(token);
const redis = session.client;

// All native Redis commands available
await redis.set("key", "value");
await redis.incr("counter");
await redis.hincrby("hash", "field", 1);

// Transactions
const result = await redis
  .multi()
  .set("key1", "value1")
  .set("key2", "value2")
  .exec();

// Subscriptions
const subscriber = redis.duplicate();
await subscriber.subscribe("channel", (message) => {
  console.log(message);
});
```

## Error Handling

```typescript
import { ConnectionError, GatewayResolutionError } from "@bridgebase/redis";

try {
  const session = await connectRedis(token);
  const redis = session.client;
  await redis.set("key", "value");
} catch (error) {
  if (error instanceof GatewayResolutionError) {
    console.error("Failed to resolve gateway");
  } else if (error instanceof ConnectionError) {
    console.error("Failed to connect to Redis");
  }
} finally {
  await session?.disconnect();
}
```

## Cleanup

```typescript
const session = await connectRedis(token);
try {
  const redis = session.client;
  // Use the client
} finally {
  await session.disconnect();
}
```

## License

MIT
