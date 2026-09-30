-- Clean-install platform state. This is a transactional PostgreSQL document,
-- not an import of the old platform_state.json. Normalized social/ledger
-- transaction boundaries remain separate SERVER-2/4 work.
CREATE TABLE IF NOT EXISTS platform_document (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(state) = 'object')
);
