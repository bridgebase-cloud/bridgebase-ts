import { connectRedis } from "@bridgebase/redis";
import { connectTigerBeetle, id, type Account, type Transfer } from "@bridgebase/tigerbeetle";
import type { RedisClientType } from "redis";

const TB_TOKEN = "eyJhbGciOi..."; // Replace with your TigerBeetle JWT token
const RD_TOKEN = "eyJhbGciOi..."; // Replace with your Redis JWT token

// Ledger configuration
const LEDGER_USD = 1;
const ACCOUNT_CODE_USER = 100;
const ACCOUNT_CODE_MERCHANT = 200;
const ACCOUNT_CODE_SYSTEM = 999; // System account for deposits/withdrawals
const ACCOUNT_CODE_FEE = 300;

interface PaymentRequest {
    fromUserId: number;
    toMerchantId: number;
    amount: bigint;
    currency: string;
    reference: string;
}

interface PaymentResult {
    transactionId: bigint;
    status: "success" | "failed";
    fromBalance: bigint;
    toBalance: bigint;
    timestamp: number;
}

/**
 * Payment Processing Service
 * 
 * Architecture:
 * - TigerBeetle: Source of truth for account balances and transaction history
 * - Redis: Fast cache for account lookups, recent transactions, and idempotency
 * 
 * Benefits:
 * - Microsecond latency balance checks via Redis
 * - ACID guarantees via TigerBeetle
 * - Idempotent payment processing
 * - Real-time balance updates
 */
class PaymentService {
    private systemAccountId: bigint | null = null;

    constructor(
        private tb: Awaited<ReturnType<typeof connectTigerBeetle>>["client"],
        private redis: RedisClientType
    ) { }

    /**
     * Initialize system account for deposits and withdrawals
     */
    async initializeSystemAccount(): Promise<bigint> {
        if (this.systemAccountId) {
            return this.systemAccountId;
        }

        const accountId = id();
        const account: Account = {
            id: accountId,
            debits_pending: 0n,
            debits_posted: 0n,
            credits_pending: 0n,
            credits_posted: 0n,
            user_data_128: 0n,
            user_data_64: 0n,
            user_data_32: 0,
            reserved: 0,
            ledger: LEDGER_USD,
            code: ACCOUNT_CODE_SYSTEM,
            flags: 0,
            timestamp: 0n,
        };

        const errors = await this.tb.createAccounts([account]);
        if (errors.length > 0) {
            throw new Error(`Failed to create system account: ${errors[0].result}`);
        }

        this.systemAccountId = accountId;
        console.log(`🏦 Initialized system account: ${accountId}`);
        return accountId;
    }

    /**
     * Initialize user account in TigerBeetle and cache in Redis
     */
    async createAccount(userId: number, accountType: "user" | "merchant"): Promise<bigint> {
        const accountId = id();
        const code = accountType === "user" ? ACCOUNT_CODE_USER : ACCOUNT_CODE_MERCHANT;

        const account: Account = {
            id: accountId,
            debits_pending: 0n,
            debits_posted: 0n,
            credits_pending: 0n,
            credits_posted: 0n,
            user_data_128: 0n,
            user_data_64: BigInt(userId),
            user_data_32: 0,
            reserved: 0,
            ledger: LEDGER_USD,
            code,
            flags: 0,
            timestamp: 0n,
        };

        const errors = await this.tb.createAccounts([account]);
        if (errors.length > 0) {
            throw new Error(`Failed to create account: ${errors[0].result}`);
        }

        // Cache account mapping in Redis
        await this.redis.hSet(`account:${userId}`, {
            accountId: accountId.toString(),
            type: accountType,
            ledger: LEDGER_USD.toString(),
            createdAt: Date.now().toString(),
        });

        // Set initial balance cache
        await this.redis.set(`balance:${accountId}`, "0");

        console.log(`✅ Created ${accountType} account for user ${userId}: ${accountId}`);
        return accountId;
    }

    /**
     * Get account balance (Redis cache-first, TigerBeetle fallback)
     */
    async getBalance(accountId: bigint): Promise<bigint> {
        // Try cache first
        const cached = await this.redis.get(`balance:${accountId}`);
        if (cached !== null) {
            console.log(`💨 Balance from cache: ${cached}`);
            return BigInt(cached);
        }

        // Fallback to TigerBeetle
        const accounts = await this.tb.lookupAccounts([accountId]);
        if (accounts.length === 0) {
            throw new Error(`Account ${accountId} not found`);
        }

        const balance = accounts[0].credits_posted - accounts[0].debits_posted;

        // Update cache
        await this.redis.set(`balance:${accountId}`, balance.toString(), {
            EX: 60, // 1 minute TTL
        });

        console.log(`🐢 Balance from TigerBeetle: ${balance}`);
        return balance;
    }

    /**
     * Process payment with idempotency
     */
    async processPayment(payment: PaymentRequest): Promise<PaymentResult> {
        // Check idempotency (prevent duplicate payments)
        const idempotencyKey = `payment:${payment.reference}`;
        const existing = await this.redis.get(idempotencyKey);
        if (existing) {
            console.log(`⚠️  Duplicate payment detected: ${payment.reference}`);
            const cached = JSON.parse(existing);
            // Convert string values back to BigInt
            return {
                ...cached,
                transactionId: BigInt(cached.transactionId),
                fromBalance: BigInt(cached.fromBalance),
                toBalance: BigInt(cached.toBalance),
            };
        }

        // Lookup account IDs from Redis
        const fromAccountData = await this.redis.hGetAll(`account:${payment.fromUserId}`);
        const toAccountData = await this.redis.hGetAll(`account:${payment.toMerchantId}`);

        if (!fromAccountData.accountId || !toAccountData.accountId) {
            throw new Error("Account not found");
        }

        const fromAccountId = BigInt(fromAccountData.accountId);
        const toAccountId = BigInt(toAccountData.accountId);

        // Calculate fee (2.9% + $0.30)
        const feeAmount = (payment.amount * 29n) / 1000n + 30n;
        const merchantAmount = payment.amount - feeAmount;

        // Create transfer ID
        const transferId = id();

        // Two-phase transfer in TigerBeetle
        const transfers: Transfer[] = [
            // User -> Merchant
            {
                id: transferId,
                debit_account_id: fromAccountId,
                credit_account_id: toAccountId,
                amount: merchantAmount,
                pending_id: 0n,
                user_data_128: 0n,
                user_data_64: 0n,
                user_data_32: 0,
                timeout: 0,
                ledger: LEDGER_USD,
                code: 1,
                flags: 0,
                timestamp: 0n,
            },
            // User -> Fee Account (if fee exists)
            ...(feeAmount > 0n ? [{
                id: id(),
                debit_account_id: fromAccountId,
                credit_account_id: this.systemAccountId!, // Fee goes to system account
                amount: feeAmount,
                pending_id: 0n,
                user_data_128: 0n,
                user_data_64: 0n,
                user_data_32: 0,
                timeout: 0,
                ledger: LEDGER_USD,
                code: 2,
                flags: 0,
                timestamp: 0n,
            }] : []),
        ];

        const errors = await this.tb.createTransfers(transfers);

        let status: "success" | "failed" = "success";
        if (errors.length > 0) {
            console.error(`❌ Transfer failed: ${errors[0].result}`);
            status = "failed";
        }

        // Invalidate balance cache
        await this.redis.del(`balance:${fromAccountId}`);
        await this.redis.del(`balance:${toAccountId}`);

        // Get updated balances
        const fromBalance = await this.getBalance(fromAccountId);
        const toBalance = await this.getBalance(toAccountId);

        const result: PaymentResult = {
            transactionId: transferId,
            status,
            fromBalance,
            toBalance,
            timestamp: Date.now(),
        };

        // Store idempotency record (24 hour expiry)
        // Convert BigInt to string for JSON serialization
        await this.redis.set(idempotencyKey, JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ), {
            EX: 86400,
        });

        // Store transaction in Redis sorted set for recent history
        await this.redis.zAdd(`txns:${payment.fromUserId}`, {
            score: result.timestamp,
            value: JSON.stringify({
                id: transferId.toString(),
                type: "debit",
                amount: payment.amount.toString(),
                merchant: payment.toMerchantId,
                reference: payment.reference,
            }),
        });

        await this.redis.zAdd(`txns:${payment.toMerchantId}`, {
            score: result.timestamp,
            value: JSON.stringify({
                id: transferId.toString(),
                type: "credit",
                amount: merchantAmount.toString(),
                user: payment.fromUserId,
                reference: payment.reference,
            }),
        });

        // Trim to last 100 transactions
        await this.redis.zRemRangeByRank(`txns:${payment.fromUserId}`, 0, -101);
        await this.redis.zRemRangeByRank(`txns:${payment.toMerchantId}`, 0, -101);

        console.log(`💳 Payment processed: ${payment.amount} from user ${payment.fromUserId} to merchant ${payment.toMerchantId}`);
        return result;
    }

    /**
     * Get recent transactions from Redis cache
     */
    async getRecentTransactions(userId: number, limit: number = 10): Promise<any[]> {
        const txns = await this.redis.zRange(`txns:${userId}`, -limit, -1);
        return txns.map((tx) => JSON.parse(tx));
    }

    /**
     * Deposit funds into account
     */
    async deposit(userId: number, amount: bigint): Promise<void> {
        if (!this.systemAccountId) {
            throw new Error("System account not initialized. Call initializeSystemAccount() first.");
        }

        const accountData = await this.redis.hGetAll(`account:${userId}`);
        if (!accountData.accountId) {
            throw new Error("Account not found");
        }

        const accountId = BigInt(accountData.accountId);
        const transferId = id();

        // System credit (from external source)
        const transfer: Transfer = {
            id: transferId,
            debit_account_id: this.systemAccountId, // Use initialized system account
            credit_account_id: accountId,
            amount,
            pending_id: 0n,
            user_data_128: 0n,
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0,
            ledger: LEDGER_USD,
            code: 100, // Deposit code
            flags: 0,
            timestamp: 0n,
        };

        await this.tb.createTransfers([transfer]);

        // Invalidate cache
        await this.redis.del(`balance:${accountId}`);

        console.log(`💵 Deposited ${amount} to user ${userId}`);
    }
}

/**
 * Demo: Payment processing flow
 */
async function main() {
    console.log("🚀 Starting BridgeBase Payment System Demo\n");

    // Connect to both databases
    const tbSession = await connectTigerBeetle(TB_TOKEN, { clusterId: 0 });
    const redisSession = await connectRedis(RD_TOKEN, { db: 0 });

    const paymentService = new PaymentService(tbSession.client, redisSession.client);

    try {
        // 0. Initialize system account
        console.log("🏦 Step 0: Initializing system account...\n");
        await paymentService.initializeSystemAccount();
        console.log();

        // 1. Create accounts (using numeric IDs)
        console.log("📝 Step 1: Creating accounts...\n");
        await paymentService.createAccount(1001, "user");       // Alice = 1001
        await paymentService.createAccount(2001, "merchant");   // Acme = 2001
        console.log();

        // 2. Deposit funds
        console.log("💰 Step 2: Depositing funds...\n");
        await paymentService.deposit(1001, 10000n); // $100.00 to Alice
        console.log();

        // 3. Check balance (should hit cache after first lookup)
        console.log("🔍 Step 3: Checking balance...\n");
        const accountData = await redisSession.client.hGetAll("account:1001");
        const aliceId = BigInt(accountData.accountId);

        await paymentService.getBalance(aliceId);
        await paymentService.getBalance(aliceId); // Cache hit
        console.log();

        // 4. Process payment
        console.log("💳 Step 4: Processing payment...\n");
        const result = await paymentService.processPayment({
            fromUserId: 1001,
            toMerchantId: 2001,
            amount: 5000n, // $50.00
            currency: "USD",
            reference: `PAY-${Date.now()}`,
        });
        console.log(`Result:`, result);
        console.log();

        // 5. Try duplicate payment (idempotency check)
        console.log("🔄 Step 5: Testing idempotency...\n");
        const duplicateResult = await paymentService.processPayment({
            fromUserId: 1001,
            toMerchantId: 2001,
            amount: 5000n,
            currency: "USD",
            reference: `PAY-${Date.now()}`,
        });
        console.log();

        // 6. Get recent transactions
        console.log("📜 Step 6: Recent transactions...\n");
        const aliceTxns = await paymentService.getRecentTransactions(1001);
        console.log("Alice's transactions:", JSON.stringify(aliceTxns, null, 2));
        console.log();

        // 7. Check final balances
        console.log("💵 Step 7: Final balances...\n");
        const merchantData = await redisSession.client.hGetAll("account:2001");
        const merchantId = BigInt(merchantData.accountId);

        console.log(`Alice (1001) balance: $${Number(result.fromBalance) / 100}`);
        console.log(`Merchant (2001) balance: $${Number(result.toBalance) / 100}`);

    } finally {
        // Cleanup
        console.log("\n🧹 Cleaning up...");
        await redisSession.disconnect();
        await tbSession.disconnect();
        console.log("✅ Done!");
    }
}

main().catch(console.error);
