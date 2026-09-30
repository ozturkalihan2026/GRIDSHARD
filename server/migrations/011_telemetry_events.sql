-- Fresh operational telemetry; the old web_test_telemetry.json is not read.
CREATE TABLE IF NOT EXISTS telemetry_events (
    sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(48) NOT NULL,
    timestamp_ms BIGINT NOT NULL,
    player_id VARCHAR(72),
    session_id VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CHECK (timestamp_ms >= 0),
    CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE INDEX IF NOT EXISTS telemetry_events_player_idx
    ON telemetry_events (player_id, sequence DESC);
