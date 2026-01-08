--- Creates wallets table ---
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    balance DECIMAL(19, 4) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT balance_non_negative CHECK (balance >= 0),
    CONSTRAINT version_non_negative CHECK (version >= 0)
);


-- Creates indexes for user lookups
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);


-- Creates wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(36) PRIMARY KEY,
    wallet_id VARCHAR(36) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    CONSTRAINT type_check CHECK (type IN ('FUND', 'TRANSFER_IN', 'TRANSFER_OUT')),
    CONSTRAINT status_check CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED'))
);


-- Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON wallet_transactions(created_at DESC);
