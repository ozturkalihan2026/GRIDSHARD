-- Fresh team state in PostgreSQL. No web_test_teams.json import.
CREATE TABLE IF NOT EXISTS team_document (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    state JSONB NOT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(state) = 'object'),
    CHECK (revision > 0)
);
