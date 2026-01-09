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
    // saveTransaction(transaction: WalletTransaction, client?: PoolClient): Promise<void>;
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
    async save(wallet: Wallet, client?: PoolClient): Promise<void> {
        const executor = client || this.db;
        const isNew = wallet.getVersion() === 0;
        console.log("walllet->->: ", wallet)
        console.log("ISNew->->: ", isNew)

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
            const currentVersion = wallet.getVersion();
            const previousVersion = currentVersion - 1;

            const query = `
            UPDATE wallets
            SET balance = $1, version = $2, updated_at = $3
            WHERE id = $4 AND version = $5
        `;
            const values = [
                wallet.getBalance().getValue(),
                currentVersion,
                wallet.getUpdatedAt(),
                wallet.getId().toString(),
                previousVersion
            ];

            const result = await executor.query(query, values);

            if (result.rowCount === 0) {
                // Check if wallet exists at all
                const checkQuery = 'SELECT version FROM wallets WHERE id = $1';
                const checkResult = await executor.query(checkQuery, [wallet.getId().toString()]);

                if (checkResult.rowCount === 0) {
                    throw new Error(`Wallet not found: ${wallet.getId().toString()}`);
                } else {
                    const actualVersion = checkResult.rows[0].version;
                    throw new Error(
                        `Optimistic lock failure: Expected version ${previousVersion}, but current version is ${actualVersion}`
                    );
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
        SELECT * FROM wallets
        WHERE id = $1
        `;

        const values = [walletId.toString()];
        console.log("WR -> walletid value", values);

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
        console.log("WR-> Alice user-id", wallet.getId());

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
    public async findByIdForUpdate(
        walletId: WalletId,
        client: PoolClient
    ): Promise<Wallet | null> {

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
}
