import { WalletId } from '../value-objects/wallet-id.vo';
import { Money } from '../value-objects/money.vo';
import { randomUUID } from 'crypto';

export enum TransactionType {
    FUND = 'FUND',
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum TransactionStatus {
    COMPLETED = 'COMPLETED',
    PENDING = 'PENDING',
    FAILED = 'FAILED',
}

export class WalletTransaction {
    private readonly id: string;
    private readonly walletId: WalletId;
    private readonly amount: Money;
    private readonly type: TransactionType;
    private readonly status: TransactionStatus;
    private readonly createdAt: Date;

    private constructor(
        id: string,
        walletId: WalletId,
        amount: Money,
        type: TransactionType,
        status: TransactionStatus,
        createdAt: Date
    ) {
        this.id = id;
        this.walletId = walletId;
        this.amount = amount;
        this.type = type;
        this.status = status;
        this.createdAt = createdAt;
    }

    /**
     * Creates a new transaction.
     * Use this when recording a new wallet operation.
     * @param walletId
     */
    static create(
        walletId: WalletId,
        amount: Money,
        type: TransactionType,
        status: TransactionStatus
    ): WalletTransaction {

        return new WalletTransaction(
            randomUUID(),
            walletId,
            amount,
            type,
            status,
            new Date()
        );
    }

    /**
     * Reconstitutes a transaction from database data.
     * Use this when loading existing transactions.
     * @param id
     * @param walletId
     * @param amount
     * @param type
     * @param status
     * @param createdAt
     * 
     * @returns WalletTransaction
     */
    static reconstitute(
        id: string,
        walletId: string,
        amount: number,
        type: string,
        status: string,
        createdAt: Date
    ): WalletTransaction {
        // Validate transaction type
        if (!Object.values(TransactionType).includes(type as TransactionType)) {
            throw new Error(`Invalid transaction type: ${type}`);
        }
        
        // Validate transaction status
        if (!Object.values(TransactionStatus).includes(status as TransactionStatus)) {
            throw new Error(`Invalid transaction status: ${status}`);
        }
        
        return new WalletTransaction(
            id,
            WalletId.create(walletId),
            Money.create(amount),
            type as TransactionType,
            status as TransactionStatus,
            createdAt
        );
    }

    /**
     *  Checks if the transaction is completed.
     * @returns boolean
     */
    public isCompleted(): boolean {
        return this.status === TransactionStatus.COMPLETED;
    }

    /**
     * Checks if the transaction is pending.
     * @returns boolean
     */
    public isPending(): boolean {
        return this.status === TransactionStatus.PENDING;
    }

    /**
     * Checks if the transaction is failed.
     * @returns boolean
     */
    public isFailed(): boolean {
        return this.status === TransactionStatus.FAILED;
    }

    /**
     * Checks if the transaction is a credit type.
     * @returns boolean
     */
    public isCredit(): boolean {
        return this.type === TransactionType.FUND || 
               this.type === TransactionType.TRANSFER_IN;
    }

    /**
     * Checks if the transaction is a debit type.
     * @returns boolean
     */
    public isDebit(): boolean {
        return this.type === TransactionType.TRANSFER_OUT;
    }

    // Getters
    getId(): string { return this.id; }
    getWalletId(): WalletId { return this.walletId; }
    getAmount(): Money { return this.amount; }
    getType(): TransactionType { return this.type; }
    getStatus(): TransactionStatus { return this.status; }
    getCreatedAt(): Date { return this.createdAt; }
}