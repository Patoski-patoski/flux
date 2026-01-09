import { WalletId } from '../value-objects/wallet-id.vo';
import { Money } from '../value-objects/money.vo';

export class Wallet {
    private readonly id: WalletId;
    private readonly userId: string;
    private balance: Money;
    private version: number;
    private readonly createdAt: Date;
    private updatedAt: Date;

    private constructor(
        id: WalletId,
        userId: string,
        balance: Money,
        version: number,
        createdAt: Date,
        updatedAt: Date
    ) {
        this.id = id;
        this.userId = userId;
        this.balance = balance;
        this.version = version;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    /**
     * Creates a new wallet for a user.
     * To be used when a user signs up or requests a new wallet.
     */
    public static create(userId: string): Wallet {
        if (!userId || typeof userId !== 'string') {
            throw new Error('userId is required');
        }

        return new Wallet(
            WalletId.generate(),
            userId,
            Money.create(0),
            0,
            new Date(),
            new Date()
        );
    }

    /**
     * Reconstitutes a wallet from database data.
     * To be used when loading existing wallets.
     */
     public static reconstitute(
        id: string,
        userId: string,
        balance: number,
        version: number,
        createdAt: Date,
        updatedAt: Date
    ): Wallet {

        return new Wallet(
            WalletId.create(id),
            userId,
            Money.create(balance),
            version,
            createdAt,
            updatedAt
        );
    }

    /**
     * Adds money to the wallet.
     */
    public fund(amount: Money): void {
        this.balance = this.balance.add(amount);
        this.version += 1;
        this.updatedAt = new Date();
    }

    /**
     * Removes money from the wallet.
     * Throws error if insufficient funds.
     */
    public debit(amount: Money): void {
        this.balance = this.balance.subtract(amount);
        this.version += 1;
        this.updatedAt = new Date();
    }

    /**
     * Checks if wallet has sufficient funds for debit.
     * @param amount
     * @returns boolean
     */
    public canDebit(amount: Money): boolean {
        return this.balance.isGreaterThan(amount) || this.balance.equals(amount);
    }

    // Getters
    getId(): WalletId { return this.id; }
    getUserId(): string { return this.userId; }
    getBalance(): Money { return this.balance; }
    getVersion(): number { return this.version; }
    getCreatedAt(): Date { return this.createdAt; }
    getUpdatedAt(): Date { return this.updatedAt; }
}

const wallet = Wallet.create('alice@example.com');
console.log(`Balance: ${wallet.getBalance().toString()}`); // $0.0000

wallet.fund(Money.create(1000));
console.log(`After funding: ${wallet.getBalance().toString()}`); // $100.0000

wallet.debit(Money.create(300));
console.log(`After debit: ${wallet.getBalance().toString()}`); // $70.0000
console.log(`Version: ${wallet.getVersion()}`); // 2