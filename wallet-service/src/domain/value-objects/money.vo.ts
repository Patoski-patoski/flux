/**
 * Money Value Object.
 * Represents a monetary amount with fixed precision.
 */
export class Money {
    private readonly amount: bigint;
    private static readonly PRECISION = 4;
    private static readonly FACTOR = BigInt(10 ** Money.PRECISION);

    private constructor(amount: bigint) {
        if (amount < 0n) {
            throw new Error('Amount cannot be negative');
        }
        this.amount = amount;
    }

    /**
     * Creates a Money instance from a number.
     * 
     * @param value 
     * @returns Money Object
     */
    static create(value: number): Money {
        // check decimal places before converting
        if(typeof value !== 'number' || isNaN(value) || !isFinite(value) || value < 0) {
            throw new Error('Invalid amount for Money');
        }

        const decimalPlace = (value.toString().split('.')[1] || '').length;

        if (decimalPlace > Money.PRECISION) {
            throw new Error(`Money exceeds maximum precision of ${Money.PRECISION} decimal places`);
        }
        const scaledAmount = BigInt(Math.round(value * Number(Money.FACTOR)));
        return new Money(scaledAmount);
    }

    /**
     *  Adds two Money instances.
     * @param other
     * @returns Money
     */
    public add(other: Money): Money {
        return new Money(this.amount + other.amount)
    }

    /**
     * Subtracts another Money instance from this one.
     * @param other 
     * @returns Money
     */
    public subtract(other: Money): Money {
        if(!(other instanceof Money)) {
            throw new Error('Amount must be a Money instance');
        }
        if (this.amount < other.amount) {
            throw new Error('Insufficient funds: cannot substract larger amount');
        }
        return new Money(this.amount - other.amount)
    }


    /**
     * Checks the equality between two Money instances.
     * @param other 
     * @returns boolean
     */
    public equals(other: Money): boolean {
        if (!(other instanceof Money)) {
            return false;
        }
        return this.amount === other.amount;
    }

    /**
     * Checks if this Money instance is greater than another.
     * @param other 
     * @returns boolean
     */
    public isGreaterThan(other: Money): boolean {
        if (!(other instanceof Money)) {
            return false;
        }
        return this.amount > other.amount;
    }

    /**
     * Returns the value of this Money instance as a number.
     * @returns The value of this Money instance.
     */
    public getValue(): number {
        return Number(this.amount) / Number(Money.FACTOR);
    }

    /**
     * Returns a string representation of this Money instance.
     * @returns string
     */
    public toString(): string {
        return this.getValue().toFixed(Money.PRECISION);
    }

}


const price = Money.create(250.35);
console.log(price.toString());
console.log(price.getValue());
