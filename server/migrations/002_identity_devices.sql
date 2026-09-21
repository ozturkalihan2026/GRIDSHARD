ALTER TABLE participant_identities
    ADD COLUMN IF NOT EXISTS devices JSONB NOT NULL DEFAULT '{}'::jsonb;
