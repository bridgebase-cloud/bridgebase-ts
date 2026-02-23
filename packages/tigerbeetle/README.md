# @bridgebase/tigerbeetle

TigerBeetle adapter for BridgeBase - Native TigerBeetle client with gateway integration.

## Features

- **Minimal Abstraction** - Direct pass-through to native TigerBeetle client
- **Gateway Integration** - Automatic proxy tunnel setup via BridgeBase
- **Full TigerBeetle Support** - Access to all TigerBeetle operations
- **Type Safe** - Full TypeScript support with native types

## Installation

```bash
npm install @bridgebase/tigerbeetle tigerbeetle-node
```

## Quick Start

```typescript
import { connectTigerBeetle, id, type Account } from "@bridgebase/tigerbeetle";

// Auto-connects and returns session
const session = await connectTigerBeetle("your-jwt-token", { clusterId: 0 });
const tb = session.client; // Access native TigerBeetle client

// Use native TigerBeetle client
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
```

## Factory Functions

### connectTigerBeetle()

Creates a session and automatically connects:

```typescript
const session = await connectTigerBeetle(jwtToken, {
  clusterId?: number;     // TigerBeetle cluster ID (default: 0)
  apiBaseUrl?: string;    // BridgeBase API endpoint
});

const tb = session.client; // Native TigerBeetle client
```

### createTigerBeetleSession()

Creates a session without auto-connecting:

```typescript
const session = createTigerBeetleSession(jwtToken, options);
const tb = await session.connect(); // Manual connect
```

### Accessing TigerBeetle Functions

```typescript
import { connectTigerBeetle, id } from "@bridgebase/tigerbeetle";

const session = await connectTigerBeetle(token);
const tb = session.client;

// ID generation - standalone function
const accountId = id();

// All native TigerBeetle operations
await tb.createAccounts([...]);
await tb.lookupAccounts([...]);
await tb.getAccountTransfers([...]);
```

## Using Native TigerBeetle Client

Once connected, you have full access to the native TigerBeetle API:

```typescript
import { connectTigerBeetle, id, type Account } from "@bridgebase/tigerbeetle";

const session = await connectTigerBeetle(token);
const tb = session.client;

// Create accounts
const accounts: Account[] = [
  {
    id: id(),
    ledger: 1,
    code: 1,
    // ... other required fields
  },
];
const errors = await tb.createAccounts(accounts);

// Query accounts
const found = await tb.lookupAccounts([id1, id2]);

// Create transfers
const transfer = {
  id: id(),
  debit_account_id: account1Id,
  credit_account_id: account2Id,
  amount: 100n,
  // ... other required fields
};
await tb.createTransfers([transfer]);
```

## Error Handling

```typescript
import { ConnectionError, GatewayResolutionError, createTigerBeetleSession } from "@bridgebase/tigerbeetle";

try {
  const session = await connectTigerBeetle(token);
  const tb = session.client;
  await tb.createAccounts([...]);
} catch (error) {
  if (error instanceof GatewayResolutionError) {
    console.error("Failed to resolve gateway");
  } else if (error instanceof ConnectionError) {
    console.error("Failed to connect to TigerBeetle");
  }
} finally {
  await session?.disconnect();
}
```

## Cleanup

```typescript
const session = await connectTigerBeetle(token);
try {
  const tb = session.client;
  // Use the client
} finally {
  await session.disconnect();
}
```

## License

MIT
