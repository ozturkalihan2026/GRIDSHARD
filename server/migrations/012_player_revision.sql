-- Reject stale player snapshots instead of overwriting newer economy/social data.
ALTER TABLE player_data
    ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

ALTER TABLE player_data
    ADD CONSTRAINT player_data_revision_positive CHECK (revision > 0);
