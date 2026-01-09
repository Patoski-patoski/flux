import { WalletRepository } from "../../infrastructure/database/repositories/wallet.repository";
import { WalletTransactionRepository } from "../../infrastructure/database/repositories/wallet-transaction.repository";
import { Database } from "../../infrastructure/database/database";
import { Wallet } from "../../domain/entities/wallet.entity";
import { WalletTransaction, TransactionStatus, TransactionType } from "../../domain/entities/wallet-transaction.entity";
import { WalletId } from "../../domain/value-objects/wallet-id.vo";
import { Money } from "../../domain/value-objects/money.vo";

export class WalletService {
    private db: Database;
    private walletRepo: WalletRepository;
    private transactionRepo: WalletTransactionRepository;

    constructor() {
        this.db = Database.getInstance();
        this.walletRepo = new WalletRepository();
        this.transactionRepo = new WalletTransactionRepository();
    }

    /**
     * Creates a new wallet for a user.
     */
    public async createWallet(userId: string): Promise<Wallet> {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Invalid userId');
        }

        const wallet = Wallet.create(userId);
        await this.walletRepo.save(wallet);

        console.log(`✅ Created wallet ${wallet.getId().toString()} for user ${userId}`);
        return wallet;
    }

    /**
     * Adds money to a wallet.
     */
    public async fundWallet(walletId: WalletId, amount: Money): Promise<void> {
        await this.db.transaction(async (client) => {
            // Load wallet
            const wallet = await this.walletRepo.findById(walletId);
            console.log("W.S Wallet Alice funding: ", wallet);
            
            if (!wallet) {
                throw new Error(`Wallet not found: ${walletId.toString()}`);
            }

            // Fund it
            wallet.fund(amount);

            // Save wallet with client
            await this.walletRepo.save(wallet, client);

            // Create transaction record
            const transaction = WalletTransaction.create(
                walletId,
                amount,
                TransactionType.FUND,
                TransactionStatus.COMPLETED
            );
            await this.transactionRepo.save(transaction, client);

            console.log(`✅ Funded wallet ${walletId.toString()} with ${amount.toString()}`);
        });
    }

    /**
     * Transfers money from one wallet to another.
     * This is the BIG one - uses database transactions!
     */
    public async transfer(
        fromWalletId: WalletId,
        toWalletId: WalletId,
        amount: Money
    ): Promise<void> {
        // Validation: Can't transfer to yourself
        if (fromWalletId.equals(toWalletId)) {
            throw new Error('Cannot transfer to the same wallet');
        }

        await this.db.transaction(async (client) => {
            // Lock both wallets in consistent order to prevent deadlocks
            const walletIds = [fromWalletId, toWalletId].sort((a, b) =>
                a.toString().localeCompare(b.toString())
            );

            console.log(`🔒 Locking wallets in order: ${walletIds[0].toString()}, ${walletIds[1].toString()}`);

            // Lock first wallet
            const wallet1 = await this.walletRepo.findByIdForUpdate(walletIds[0], client);
            if (!wallet1) {
                throw new Error(`Wallet not found: ${walletIds[0].toString()}`);
            }

            // Lock second wallet
            const wallet2 = await this.walletRepo.findByIdForUpdate(walletIds[1], client);
            if (!wallet2) {
                throw new Error(`Wallet not found: ${walletIds[1].toString()}`);
            }

            // Determine which is sender and which is receiver
            let fromWallet: Wallet;
            let toWallet: Wallet;

            if (wallet1.getId().equals(fromWalletId)) {
                fromWallet = wallet1;
                toWallet = wallet2;
            } else {
                fromWallet = wallet2;
                toWallet = wallet1;
            }

            console.log(`💸 Transferring ${amount.toString()} from ${fromWallet.getId().toString()} to ${toWallet.getId().toString()}`);

            // Check sufficient funds
            if (!fromWallet.canDebit(amount)) {
                throw new Error(
                    `Insufficient funds. Balance: ${fromWallet.getBalance().toString()}, Required: ${amount.toString()}`
                );
            }

            // Execute the transfer
            const fromBalanceBefore = fromWallet.getBalance().toString();
            const toBalanceBefore = toWallet.getBalance().toString();

            fromWallet.debit(amount);
            toWallet.fund(amount);

            console.log(`  From: ${fromBalanceBefore} → ${fromWallet.getBalance().toString()}`);
            console.log(`  To:   ${toBalanceBefore} → ${toWallet.getBalance().toString()}`);

            // Save both wallets
            await this.walletRepo.save(fromWallet, client);
            await this.walletRepo.save(toWallet, client);

            // Create TRANSFER_OUT transaction for sender
            const outTransaction = WalletTransaction.create(
                fromWalletId,
                amount,
                TransactionType.TRANSFER_OUT,
                TransactionStatus.COMPLETED
            );
            await this.transactionRepo.save(outTransaction, client);

            // Create TRANSFER_IN transaction for receiver
            const inTransaction = WalletTransaction.create(
                toWalletId,  // ✅ Correct wallet
                amount,
                TransactionType.TRANSFER_IN,  // ✅ Correct type
                TransactionStatus.COMPLETED
            );
            await this.transactionRepo.save(inTransaction, client);

            console.log(`✅ Transfer completed successfully`);
        });
    }

    /**
     * Gets wallet balance.
     */
    async getWallet(walletId: WalletId): Promise<Wallet | null> {
        return await this.walletRepo.findById(walletId);
    }

    /**
     * Gets all wallets for a user.
     */
    async getUserWallets(userId: string): Promise<Wallet[]> {
        return await this.walletRepo.findByUserId(userId);
    }

    /**
     * Gets transaction history for a wallet.
     */
    async getWalletHistory(walletId: WalletId, limit?: number): Promise<WalletTransaction[]> {
        return await this.transactionRepo.findByWalletId(walletId, limit);
    }
}

// ============================================================================
// TEST CODE - Run this to verify everything works!
// ============================================================================

async function testWalletService() {
    console.log('\n🧪 Starting Wallet Service Tests...\n');

    const service = new WalletService();

    try {
        // Test 1: Create wallets
        console.log('📝 Test 1: Creating wallets...');
        const aliceWallet = await service.createWallet('alice@example.com');
        const bobWallet = await service.createWallet('bob@example.com');
        console.log(`Alice wallet: ${aliceWallet.getId().toString()}`);
        console.log(`Bob wallet: ${bobWallet.getId().toString()}\n`);

        // Test 2: Fund Alice's wallet
        console.log('📝 Test 2: Funding Alice\'s wallet with $100...');
        await service.fundWallet(aliceWallet.getId(), Money.create(100));
        const aliceAfterFund = await service.getWallet(aliceWallet.getId());
        console.log(`Alice balance: ${aliceAfterFund?.getBalance().toString()}\n`);

        // Test 3: Fund Bob's wallet
        console.log('📝 Test 3: Funding Bob\'s wallet with $50...');
        await service.fundWallet(bobWallet.getId(), Money.create(50));
        const bobAfterFund = await service.getWallet(bobWallet.getId());
        console.log(`Bob balance: ${bobAfterFund?.getBalance().toString()}\n`);

        // Test 4: Transfer from Alice to Bob
        console.log('📝 Test 4: Transferring $30 from Alice to Bob...');
        await service.transfer(
            aliceWallet.getId(),
            bobWallet.getId(),
            Money.create(30)
        );

        const aliceAfterTransfer = await service.getWallet(aliceWallet.getId());
        const bobAfterTransfer = await service.getWallet(bobWallet.getId());
        console.log(`Alice final balance: ${aliceAfterTransfer?.getBalance().toString()}`);
        console.log(`Bob final balance: ${bobAfterTransfer?.getBalance().toString()}\n`);

        // Test 5: Check transaction history
        console.log('📝 Test 5: Checking Alice\'s transaction history...');
        const aliceHistory = await service.getWalletHistory(aliceWallet.getId());
        console.log(`Alice has ${aliceHistory.length} transactions:`);
        aliceHistory.forEach((txn, i) => {
            console.log(`  ${i + 1}. ${txn.getType()} - ${txn.getAmount().toString()} - ${txn.getStatus()}`);
        });
        console.log();

        console.log('📝 Test 6: Checking Bob\'s transaction history...');
        const bobHistory = await service.getWalletHistory(bobWallet.getId());
        console.log(`Bob has ${bobHistory.length} transactions:`);
        bobHistory.forEach((txn, i) => {
            console.log(`  ${i + 1}. ${txn.getType()} - ${txn.getAmount().toString()} - ${txn.getStatus()}`);
        });
        console.log();

        // Test 7: Try insufficient funds (should fail)
        console.log('📝 Test 7: Testing insufficient funds (should fail)...');
        try {
            await service.transfer(
                aliceWallet.getId(),
                bobWallet.getId(),
                Money.create(1000)  // Alice doesn't have this much
            );
            console.log('❌ TEST FAILED: Should have thrown error!');
        } catch (error: any) {
            console.log(`✅ Correctly rejected: ${error.message}\n`);
        }

        // Test 8: Try self-transfer (should fail)
        console.log('📝 Test 8: Testing self-transfer (should fail)...');
        try {
            await service.transfer(
                aliceWallet.getId(),
                aliceWallet.getId(),
                Money.create(10)
            );
            console.log('❌ TEST FAILED: Should have thrown error!');
        } catch (error: any) {
            console.log(`✅ Correctly rejected: ${error.message}\n`);
        }

        console.log('🎉 ALL TESTS PASSED!\n');

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
    } finally {
        // Close database connection
        await Database.getInstance().close();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testWalletService()
        .then(() => {
            console.log('✅ Test suite completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        });
}

export { testWalletService };