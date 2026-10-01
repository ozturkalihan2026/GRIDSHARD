CREATE TABLE player_economic_operations (
    player_id VARCHAR(72) NOT NULL REFERENCES player_data(player_id) ON DELETE CASCADE,
    request_hash CHAR(64) NOT NULL,
    operation_kind VARCHAR(96) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    outcome JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, request_hash)
);
