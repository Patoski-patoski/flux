import { PoolClient, QueryResult } from "pg";
import { WalletTransaction } from "src/domain/entities/wallet-transaction.entity";
import { WalletId } from "src/domain/value-objects/wallet-id.vo";
import { Database } from "../database";


export interface IWalletTransactionRepository {
    save(transaction: WalletTransaction, client?: PoolClient): Promise<void>
    findById(id: string): Promise<WalletTransaction | null>
    findByWalletId(wallet_id: WalletId, limit: number): Promise<WalletTransaction[]>
}

export class WalletTransactionRepository implements IWalletTransactionRepository {
    private db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    /**
     * Saves a transaction to the database
     * Transactions are immutable - only INSERT, never UPDATE.
     * 
     * @param transaction
     * @param client Optional client for transaction operations
     */
    public async save(transaction: WalletTransaction, client?: PoolClient): Promise<void> {

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
        ]

        await executor.query(query, values);
    }

    /**
     * Finds a transaction by ID
     * @param id String
     * @returns WalletTransaction or null
     */

    public async findById(id: string): Promise<WalletTransaction | null> {

        const query = `
            SELECT * FROM wallet_transactions
            WHERE id = $1
            `;
        
        const result = (await this.db.query(query, [id]));
        if (result.rowCount === 0) {
            return null;
        }

        const row = result.rows[0]
        return WalletTransaction.reconstitute(
            row.id,
            row.wallet_id,
            row.amount,
            row.type,
            row.status,
            row.created_at
        )
    }

    /**
     * Finds all transactions for a wallet, ordered by newest first.
     * 
     * @param walletId
     * @param limit Maximum number of transactions to return (default: 50)
     * 
     */
    public async findByWalletId(wallet_id: WalletId, limit: number = 50): Promise<WalletTransaction[]> {

        const query = `
            SELECT * FROM wallet_transactions
            WHERE wallet_id = $1
            ORDER BY created_at
            DESC LIMIT $2
        `

        const values = [wallet_id.toString(), limit];
        const result = await this.db.query(query, values);

        if (result.rowCount === 0) {
            return []
        }

        return result.rows.map(row =>
            WalletTransaction.reconstitute(
            row.id,
            row.wallet_id,
            row.amount,
            row.type,
            row.status,
            row.createdAt
            )
        )
    }
}