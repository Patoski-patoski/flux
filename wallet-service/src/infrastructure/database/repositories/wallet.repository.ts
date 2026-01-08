/**
 * Wallet Repository
 * 
 * Implements the IWalletRepository interface to handle
 * database operations for Wallet entities.
 */

import { Pool, PoolClient } from 'pg';
import { Wallet } from 'src/domain/entities/wallet.entity';
import { WalletId } from 'src/domain/value-objects/wallet-id.vo';
import { Database } from '../../database/database';
import { Money } from 'src/domain/value-objects/money.vo';
import { TransactionStatus, TransactionType, WalletTransaction } from 'src/domain/entities/wallet-transaction.entity';


export interface IWalletRepository {
    save(wallet: Wallet): Promise<void>;
    findById(walletId: WalletId): Promise<Wallet | null>;
    findByUserId(userId: string): Promise<Wallet[]>;
    findByIdForUpdate(walletId: WalletId, client: PoolClient): Promise<Wallet | null>;
    saveTransaction(transaction: WalletTransaction, client?: PoolClient): Promise<void>;
}

export class WalletRepository implements IWalletRepository {
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Saves a wallet to the database.
     * Handles both INSERT(new) and UPDATE(existing) operations with 
     * optimistic locking.
     * 
     * @param wallet
     */
    public async save(wallet: Wallet, client?: PoolClient): Promise<void> {
        // Check if version is 0( new wallet) or existing(wallet update)
        const executor = client || this.db; // Use provided client if in transaction
        const isNew = wallet.getVersion() === 0;

        if (isNew) {
            const query = `
             INSERT INTO wallets (id, user_id, balance, version, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             `;

            const values = [
                wallet.getId().toString(),
                wallet.getUserId(),
                wallet.getBalance().getValue(),
                wallet.getVersion(),
                wallet.getCreatedAt(),
                wallet.getUpdatedAt()
            ];

            await executor.query(query, values);

        } else {
            const query = `
            UPDATE wallets
            SET balance = $1, version = $2, updated_at = $3
            WHERE id = $4 AND version = $5
            `;
            const currentVersion = wallet.getVersion();
            const previousVersion = currentVersion - 1;

            const values = [
                wallet.getBalance().getValue(),
                currentVersion, // sets version to current. SET version = 2
                wallet.getUpdatedAt(),
                wallet.getId().toString(),
                previousVersion // WHERE version = 1
            ];

            const result = await executor.query(query, values);

            // Check if any row was updated. If not, optimistic lock failed.
            if (result.rowCount === 0) {
                // Could be: wallet not found or version mismatch
                // Check which one it is
                const checkQuery = `SELECT version FROM wallets WHERE id = $1`;
                const checkResult = await this.db.query(checkQuery, [wallet.getId().toString()]);

                if (checkResult.rowCount === 0) {
                    throw new Error(`Wallet not found: ${wallet.getId().toString()}`);
                } else {
                    throw new Error('Optimistic lock failure: Wallet was modified by another transaction');
                }
            }
        }
    }

    /**
     * Finds a wallet by its ID.
     * @param walletId
     */
    public async findById(walletId: WalletId): Promise<Wallet | null> {
        // TODO: SELECT query and reconstitute Wallet entity
        const query = `
        SELECT id, user_id, balance, version, created_at, updated_at
        FROM wallets
        WHERE id = $1
        `;

        const values = [walletId.toString()];

        const result = await this.db.query(query, values);

        if (result.rowCount === 0) {
            return null;
        }

        const row = result.rows[0];
        const wallet = Wallet.reconstitute(
            row.id,
            row.user_id,
            row.balance,
            row.version,
            row.created_at,
            row.updated_at
        );

        return wallet;
    }

    /**
     * Finds all wallets for a given user ID.
     */

    public async findByUserId(userId: string): Promise<Wallet[]> {
        //TODO: SELECT query to get all wallets for userId =?
        const query = `
        SELECT id, user_id, balance, version, created_at, updated_at
        FROM wallets
        WHERE user_id = $1
        `;
        const values = [userId];

        const result = await this.db.query(query, values);

        if (result.rowCount === 0) {
            return [];
        }
        const wallet = result.rows.map(row =>
            Wallet.reconstitute(
                row.id,
                row.user_id,
                row.balance,
                row.version,
                row.created_at,
                row.updated_at
            )
        );

        return wallet;
    }


    /**
    * Finds wallet and locks the row for update (pessimistic lock).
    * MUST be called within a transaction!
    * 
    * @param walletId
    * @param client
    */
    public async findByIdForUpdate(walletId: WalletId, client: PoolClient): Promise<Wallet | null> {
        const query = `
        SELECT id, user_id, balance, version, created_at, updated_at
        FROM wallets
        WHERE id = $1
        FOR UPDATE -- Lock the selected row until the end of the transaction
        `;

        const result = await client.query(query, [walletId.toString()]);

        if (result.rowCount === 0) {
            return null;
        }

        const row = result.rows[0];
        const wallet = Wallet.reconstitute(
            row.id,
            row.user_id,
            row.balance,
            row.version,
            row.created_at,
            row.updated_at
        );
        return wallet;
    }


    public async saveTransaction(transaction: WalletTransaction, client?: PoolClient): Promise<void> {
        const executor = client || this.db;
        const query = `
            INSERT INTO wallet_transactions (id, wallet_id, amount, type, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [
            transaction.getId(),
            transaction.getWalletId().toString(),
            transaction.getAmount().getValue(),
            transaction.getType(),
            transaction.getStatus(),
            transaction.getCreatedAt()
        ];
        await executor.query(query, values);
    }

    /**
     * Transfers money from one wallet to another.
     * 
     * @param fromwalletId 
     * @param toWalletId 
     * @param amount 
     * @returns 
     */

    public async transferMoney(fromwalletId: WalletId, toWalletId: WalletId, amount: Money): Promise<void> {
        return await this.db.transaction(async (client: PoolClient) => {
            // Lock both wallets for update
            // To prevent deadlocks, always lock in a consistent order
            const [firstId, secondId] = [fromwalletId, toWalletId].sort();

            const fromWallet = await this.findByIdForUpdate(firstId, client);
            const toWallet = await this.findByIdForUpdate(secondId, client);

            if(!fromWallet || !toWallet) {
                throw new Error('One or both wallets not found');
            }

            // Business logic: check sufficient funds
            fromWallet.debit(amount);
            toWallet.fund(amount);

            //Save both (or rollback if either fails)
            await this.save(fromWallet, client);
            await this.save(toWallet, client);

            // Create transaction records
            await this.saveTransaction(
                WalletTransaction.create(fromWallet.getId(), amount, TransactionType.TRANSFER_OUT, TransactionStatus.COMPLETED),
                client
            );
            await this.saveTransaction(
                WalletTransaction.create(toWallet.getId(), amount, TransactionType.TRANSFER_IN, TransactionStatus.COMPLETED),
                client
            );


        });
    }
}


// Demo runner — paste at the end of the file. Run this file directly to exercise methods.
if (require.main === module) {
  (async () => {
    const repo = new WalletRepository();

    console.log('--- WalletRepository demo ---');

    // Demo: create a WalletTransaction and inspect getters (no DB needed)
    try {
      const demoWalletId = WalletId.generate();
      const demoAmount = Money.create(12.34);
      const demoTx = WalletTransaction.create(demoWalletId, demoAmount, TransactionType.FUND, TransactionStatus.COMPLETED);

      console.log('Transaction id:', demoTx.getId());
      console.log('Transaction walletId:', demoTx.getWalletId().toString());
      console.log('Transaction amount:', demoTx.getAmount().getValue());
      console.log('Transaction type/status:', demoTx.getType(), demoTx.getStatus());
    } catch (err) {
        console.error('Transaction demo failed:', (err as Error).message || err);
    }

    // DB-backed method calls (will fail if DB not configured). Errors are caught and logged.
    try {
      const a = WalletId.generate();
      const b = WalletId.generate();
      console.log('Attempting transferMoney (requires DB) between', a.toString(), '->', b.toString());
      await repo.transferMoney(a, b, Money.create(1.23));
      console.log('transferMoney completed successfully');
    } catch (err) {
      console.error('transferMoney (expected without DB):', (err as Error).message || err);
    }

    try {
      const lookup = WalletId.generate();
      console.log('Attempting findById for', lookup.toString());
      const found = await repo.findById(lookup);
      console.log('findById result:', found);
    } catch (err) {
      console.error('findById error:', (err as Error).message || err);
    }

    try {
      const txToSave = WalletTransaction.create(WalletId.generate(), Money.create(2.5), TransactionType.TRANSFER_IN, TransactionStatus.COMPLETED);
      console.log('Attempting saveTransaction (requires DB) for tx', txToSave.getId());
      await repo.saveTransaction(txToSave);
      console.log('saveTransaction succeeded');
    } catch (err) {
      console.error('saveTransaction (expected without DB):', (err as Error).message || err);
    }

    console.log('--- Demo finished ---');
    process.exit(0);
  })();
}