-- Fresh per-player battle-pool presets; no legacy JSON import.
CREATE TABLE IF NOT EXISTS battle_pool_presets (
    player_id VARCHAR(72) PRIMARY KEY,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(state) = 'object')
);
