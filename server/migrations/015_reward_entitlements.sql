CREATE TABLE player_reward_entitlements (
    player_id VARCHAR(72) NOT NULL REFERENCES player_data(player_id) ON DELETE CASCADE,
    entitlement_key CHAR(64) NOT NULL CHECK (entitlement_key ~ '^[0-9a-f]{64}$'),
    source VARCHAR(48) NOT NULL CHECK (length(source) > 0),
    period_id VARCHAR(128) NOT NULL CHECK (length(period_id) > 0),
    node_id VARCHAR(128) NOT NULL CHECK (length(node_id) > 0),
    earned_document JSONB NOT NULL CHECK (jsonb_typeof(earned_document) = 'object'),
    earned_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    selected_option_id VARCHAR(128),
    request_hash CHAR(64) CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    receipt JSONB CHECK (jsonb_typeof(receipt) = 'object'),
    PRIMARY KEY (player_id, entitlement_key),
    UNIQUE (player_id, source, period_id, node_id),
    CHECK (
        (delivered_at IS NULL AND selected_option_id IS NULL AND request_hash IS NULL AND receipt IS NULL)
        OR (delivered_at IS NOT NULL AND delivered_at >= earned_at AND request_hash IS NOT NULL AND receipt IS NOT NULL)
    )
);

CREATE UNIQUE INDEX player_reward_entitlements_request_idx
    ON player_reward_entitlements (player_id, request_hash) WHERE request_hash IS NOT NULL;

CREATE INDEX player_reward_entitlements_pending_idx
    ON player_reward_entitlements (player_id, entitlement_key) WHERE delivered_at IS NULL;
