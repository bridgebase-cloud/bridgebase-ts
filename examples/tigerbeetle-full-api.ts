/**
 * Complete TigerBeetle API Example
 * 
 * Demonstrates all methods available from tigerbeetle-node
 * via @bridgebase/tigerbeetle adapter
 */

import { 
  connectTigerBeetle,
  id,
  type Account,
  type Transfer,
  type AccountFilter,
  type AccountBalance,
  AccountFilterFlags,
  AccountFlags,
  TransferFlags,
} from "@bridgebase/tigerbeetle";

const TB_TOKEN = process.env.TB_TOKEN || "your-jwt-token";

async function demonstrateFullAPI() {
  console.log("🐯 TigerBeetle Full API Demonstration\n");

  // Connect with all options
  const { client: tb, disconnect } = await connectTigerBeetle(TB_TOKEN, {
    clusterId: 0,
    concurrencyMax: 64, // Custom concurrency setting
  });

  try {
    // =====================================================
    // 1. ID GENERATION
    // =====================================================
    console.log("📝 1. ID Generation");
    const id1 = id();
    const id2 = id();
    const id3 = id();
    console.log(`Generated IDs: ${id1}, ${id2}, ${id3}\n`);

    // =====================================================
    // 2. CREATE ACCOUNTS
    // =====================================================
    console.log("💰 2. Creating Accounts");
    
    const accounts: Account[] = [
      {
        id: id1,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: 1, // USD
        code: 100, // User account type
        flags: 0,
        timestamp: 0n,
      },
      {
        id: id2,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: 1,
        code: 200, // Merchant account type
        flags: 0,
        timestamp: 0n,
      },
    ];

    const accountErrors = await tb.createAccounts(accounts);
    if (accountErrors.length > 0) {
      console.error("Account creation errors:", accountErrors);
    } else {
      console.log(`✅ Created ${accounts.length} accounts\n`);
    }

    // =====================================================
    // 3. LOOKUP ACCOUNTS
    // =====================================================
    console.log("🔍 3. Looking Up Accounts");
    
    const lookedUpAccounts = await tb.lookupAccounts([id1, id2]);
    lookedUpAccounts.forEach((account) => {
      console.log(`Account ${account.id}:`);
      console.log(`  Balance: ${account.credits_posted - account.debits_posted}`);
      console.log(`  Ledger: ${account.ledger}, Code: ${account.code}`);
    });
    console.log();

    // =====================================================
    // 4. CREATE TRANSFERS
    // =====================================================
    console.log("💸 4. Creating Transfers");
    
    const transferId = id();
    const transfers: Transfer[] = [
      {
        id: transferId,
        debit_account_id: id1,
        credit_account_id: id2,
        amount: 1000n, // $10.00 in cents
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: 1,
        code: 1, // Payment transfer
        flags: 0,
        timestamp: 0n,
      },
    ];

    const transferErrors = await tb.createTransfers(transfers);
    if (transferErrors.length > 0) {
      console.error("Transfer errors:", transferErrors);
    } else {
      console.log(`✅ Created ${transfers.length} transfer(s)\n`);
    }

    // =====================================================
    // 5. LOOKUP TRANSFERS
    // =====================================================
    console.log("🔍 5. Looking Up Transfers");
    
    const lookedUpTransfers = await tb.lookupTransfers([transferId]);
    lookedUpTransfers.forEach((transfer) => {
      console.log(`Transfer ${transfer.id}:`);
      console.log(`  From: ${transfer.debit_account_id}`);
      console.log(`  To: ${transfer.credit_account_id}`);
      console.log(`  Amount: ${transfer.amount}`);
      console.log(`  Code: ${transfer.code}`);
    });
    console.log();

    // =====================================================
    // 6. GET ACCOUNT TRANSFERS
    // =====================================================
    console.log("📜 6. Getting Account Transfers");
    
    const accountFilter: AccountFilter = {
      account_id: id1,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      code: 0,
      timestamp_min: 0n,
      timestamp_max: 0n, // 0 means no limit
      limit: 10,
      flags: AccountFilterFlags.debits | AccountFilterFlags.credits,
    };

    const accountTransfers = await tb.getAccountTransfers(accountFilter);
    console.log(`Account ${id1} has ${accountTransfers.length} transfer(s)`);
    accountTransfers.forEach((transfer) => {
      console.log(`  - Transfer ${transfer.id}: amount ${transfer.amount}`);
    });
    console.log();

    // =====================================================
    // 7. GET ACCOUNT BALANCES
    // =====================================================
    console.log("📊 7. Getting Account Balances");
    
    const balanceFilter: AccountFilter = {
      account_id: id1,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      code: 0,
      timestamp_min: 0n,
      timestamp_max: 0n,
      limit: 10,
      flags: AccountFilterFlags.debits | AccountFilterFlags.credits,
    };

    const balances = await tb.getAccountBalances(balanceFilter);
    console.log(`Account ${id1} balance history (${balances.length} entries):`);
    balances.forEach((balance: AccountBalance) => {
      const netBalance = balance.credits_posted - balance.debits_posted;
      console.log(`  - At timestamp ${balance.timestamp}: ${netBalance}`);
    });
    console.log();

    // =====================================================
    // 8. ADVANCED: PENDING TRANSFERS (TWO-PHASE)
    // =====================================================
    console.log("⏳ 8. Two-Phase Transfer (Pending)");
    
    const pendingTransferId = id();
    const pendingTransfer: Transfer = {
      id: pendingTransferId,
      debit_account_id: id2,
      credit_account_id: id1,
      amount: 500n,
      pending_id: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 60, // 60 seconds timeout
      ledger: 1,
      code: 1,
      flags: 1, // PENDING flag
      timestamp: 0n,
    };

    const pendingErrors = await tb.createTransfers([pendingTransfer]);
    if (pendingErrors.length === 0) {
      console.log("✅ Created pending transfer");

      // Post (commit) the pending transfer
      const postTransferId = id();
      const postTransfer: Transfer = {
        id: postTransferId,
        debit_account_id: id2,
        credit_account_id: id1,
        amount: 500n,
        pending_id: pendingTransferId,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: 1,
        code: 1,
        flags: 2, // POST_PENDING_TRANSFER flag
        timestamp: 0n,
      };

      const postErrors = await tb.createTransfers([postTransfer]);
      if (postErrors.length === 0) {
        console.log("✅ Posted pending transfer\n");
      }
    }

    // =====================================================
    // 9. ACCOUNT FLAGS
    // =====================================================
    console.log("🏴 9. Account with Flags");
    
    const linkedAccountId = id();
    const linkedAccount: Account = {
      id: linkedAccountId,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: 1,
      code: 300,
      flags: 1, // LINKED flag (for batch operations)
      timestamp: 0n,
    };

    const flaggedErrors = await tb.createAccounts([linkedAccount]);
    if (flaggedErrors.length === 0) {
      console.log("✅ Created account with flags\n");
    }

    // =====================================================
    // 10. FINAL ACCOUNT STATE
    // =====================================================
    console.log("📈 10. Final Account States");
    
    const finalAccounts = await tb.lookupAccounts([id1, id2]);
    finalAccounts.forEach((account) => {
      const balance = account.credits_posted - account.debits_posted;
      console.log(`Account ${account.id}:`);
      console.log(`  Debits Posted: ${account.debits_posted}`);
      console.log(`  Credits Posted: ${account.credits_posted}`);
      console.log(`  Net Balance: ${balance}`);
      console.log(`  Debits Pending: ${account.debits_pending}`);
      console.log(`  Credits Pending: ${account.credits_pending}`);
    });
    console.log();

  } finally {
    // Clean disconnect
    await disconnect();
    console.log("✅ Disconnected from TigerBeetle");
  }
}

// Run demonstration
demonstrateFullAPI().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
