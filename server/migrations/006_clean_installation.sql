-- Greenfield SERVER-9 installation identity. No legacy data is copied.
-- A nonempty unclaimed application schema is rejected by clean_install.py.
CREATE TABLE IF NOT EXISTS server_installation (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    installation_id UUID NOT NULL UNIQUE,
    initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
