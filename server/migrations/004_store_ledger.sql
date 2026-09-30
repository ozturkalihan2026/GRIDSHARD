-- Additive SERVER-2 ledger. No runtime switch or legacy JSON import here.
-- A receipt's key and token digest must each be unique to prevent two grants.
CREATE TABLE IF NOT EXISTS store_receipts (
    receipt_key VARCHAR(200) PRIMARY KEY,
    player_id VARCHAR(72) NOT NULL,
    provider VARCHAR(16) NOT NULL,
    product_id VARCHAR(96) NOT NULL,
    transaction_id VARCHAR(160) NOT NULL,
    granted JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment VARCHAR(32) NOT NULL DEFAULT '',
    purchased_at VARCHAR(64) NOT NULL DEFAULT '',
    token_sha256 CHAR(64) UNIQUE,
    refunded BOOLEAN NOT NULL DEFAULT FALSE,
    refund_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(granted) = 'object'),
    CHECK (jsonb_typeof(refund_history) = 'array')
);
CREATE INDEX IF NOT EXISTS store_receipts_player_idx
    ON store_receipts (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_receipts_transaction_idx
    ON store_receipts (provider, transaction_id);

CREATE TABLE IF NOT EXISTS store_notifications (
    notification_id VARCHAR(200) PRIMARY KEY,
    seen_at BIGINT NOT NULL
);
