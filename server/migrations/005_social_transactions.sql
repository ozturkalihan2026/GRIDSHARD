-- Additive SERVER-2 transaction primitives. Legacy JSON paths remain active.
-- Do not use these tables as live sources before SERVER-9 reconciliation.

CREATE TABLE IF NOT EXISTS social_operation_receipts (
    operation_id VARCHAR(96) PRIMARY KEY,
    actor_id VARCHAR(72) NOT NULL,
    target_id VARCHAR(72) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (actor_id <> target_id)
);
CREATE INDEX IF NOT EXISTS social_operation_receipts_actor_idx
    ON social_operation_receipts (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS social_battle_invites (
    invite_id VARCHAR(96) PRIMARY KEY,
    challenger_id VARCHAR(72) NOT NULL,
    opponent_id VARCHAR(72) NOT NULL,
    status VARCHAR(24) NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (challenger_id <> opponent_id)
);
CREATE INDEX IF NOT EXISTS social_battle_invites_opponent_idx
    ON social_battle_invites (opponent_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS social_push_outbox (
    outbox_id VARCHAR(96) PRIMARY KEY,
    operation_id VARCHAR(96) NOT NULL,
    recipient_id VARCHAR(72) NOT NULL,
    notification_id VARCHAR(96) NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    CHECK (attempt_count >= 0)
);
CREATE INDEX IF NOT EXISTS social_push_outbox_pending_idx
    ON social_push_outbox (created_at, outbox_id)
    WHERE delivered_at IS NULL;
