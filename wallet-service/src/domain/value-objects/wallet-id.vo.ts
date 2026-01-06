/**
 * WalletId Value Object
 */

export class WalletId {
    private readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): WalletId {
        if (!value || typeof value !== 'string') {
            throw new Error('Invalid WalletId');
        }
        return this.generate();
    }

    static generate(): WalletId {
        const uuid = crypto.randomUUID();
        return new WalletId(uuid);
    }

    equals(other: WalletId): boolean {
        if (!(other instanceof WalletId)) {
            return false;
        }
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    toJSON(): string {
        return this.toString();
    }

}

const myWalletId = WalletId.generate();
console.log(`Generated WalletId: ${myWalletId.toString()}`);
console.log(`Get walletId: ${myWalletId.toString()}`)