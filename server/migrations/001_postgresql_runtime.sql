BEGIN;

CREATE TABLE IF NOT EXISTS player_data (
    player_id VARCHAR(72) PRIMARY KEY,
    profile JSONB NOT NULL,
    statistics JSONB NOT NULL,
    settings JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participant_identities (
    player_id VARCHAR(72) PRIMARY KEY,
    salt TEXT NOT NULL,
    verifier TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_data_updated_at_idx
    ON player_data (updated_at);

COMMIT;
