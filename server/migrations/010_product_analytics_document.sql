-- Consent-controlled product analytics for the clean installation.
-- Retention, opt-out and erasure remain enforced by the service.
CREATE TABLE IF NOT EXISTS product_analytics_document (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (jsonb_typeof(events) = 'array')
);
