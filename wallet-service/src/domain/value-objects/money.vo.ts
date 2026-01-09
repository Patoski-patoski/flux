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
    public static create(value: number | string): Money {
        // Convert string to number if needed
        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (typeof numValue !== 'number'
            || isNaN(numValue)
            || !isFinite(numValue)
            || numValue < 0) {
            throw new Error('Invalid amount for Money');
        }

        // Check decimal places
        const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
        if (decimalPlaces > Money.PRECISION) {
            throw new Error(`Money cannot have more than ${Money.PRECISION} decimal places`);
        }

        const scaledAmount = BigInt(Math.round(numValue * Number(Money.FACTOR)));
        return new Money(scaledAmount);
    }
    /**
     *  Adds two Money instances.
     * @param other
     * @returns Money
     */
    public add(other: Money): Money {
        if (!other || typeof other.amount !== 'bigint') {
            throw new Error('Argument must be a Money instance');
        }
        return new Money(this.amount + other.amount)
    }


    /**
     * Subtracts another Money instance from this one.
     * @param other 
     * @returns Money
     */
    public subtract(other: Money): Money {
        if (!other || typeof other.amount !== 'bigint') {
            throw new Error('Argument must be a Money instance');
        }
        if (this.isLessThan(other)) {
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
        return this.amount === other.amount;
    }

    /**
    * Checks if this Money instance is less than another.
    * @param other 
    * @returns boolean
    */
    public isLessThan(other: Money): boolean {
        return this.amount < other.amount;
    }

    /**
     * Checks if this Money instance is greater than another.
     * @param other 
     * @returns boolean
     */
    public isGreaterThan(other: Money): boolean {
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

// const userBalance = Money.create(100);
// console.log(userBalance.isGreaterThan(21))
