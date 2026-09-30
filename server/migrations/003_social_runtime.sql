-- Additive SERVER-2 schema. Runtime reads still use the legacy stores until
-- the repository adapter and verified JSON migration are ready.
-- No foreign keys yet: legacy snapshots must be audited for orphan IDs first.

CREATE TABLE IF NOT EXISTS platform_accounts (
    player_id VARCHAR(72) PRIMARY KEY,
    account JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friend_requests (
    requester_id VARCHAR(72) NOT NULL,
    recipient_id VARCHAR(72) NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (requester_id, recipient_id),
    CHECK (requester_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS friend_requests_recipient_idx
    ON friend_requests (recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS friendships (
    player_a_id VARCHAR(72) NOT NULL,
    player_b_id VARCHAR(72) NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (player_a_id, player_b_id),
    CHECK (player_a_id < player_b_id)
);
CREATE INDEX IF NOT EXISTS friendships_player_b_idx
    ON friendships (player_b_id);

CREATE TABLE IF NOT EXISTS player_blocks (
    owner_id VARCHAR(72) NOT NULL,
    target_id VARCHAR(72) NOT NULL,
    created_at BIGINT NOT NULL,
    PRIMARY KEY (owner_id, target_id),
    CHECK (owner_id <> target_id)
);
CREATE INDEX IF NOT EXISTS player_blocks_target_idx
    ON player_blocks (target_id);

CREATE TABLE IF NOT EXISTS direct_messages (
    message_id VARCHAR(96) PRIMARY KEY,
    sender_id VARCHAR(72) NOT NULL,
    recipient_id VARCHAR(72) NOT NULL,
    body TEXT NOT NULL,
    sent_at BIGINT NOT NULL,
    CHECK (sender_id <> recipient_id),
    CHECK (char_length(body) BETWEEN 1 AND 500)
);
CREATE INDEX IF NOT EXISTS direct_messages_sender_thread_idx
    ON direct_messages (sender_id, recipient_id, sent_at DESC, message_id DESC);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_thread_idx
    ON direct_messages (recipient_id, sender_id, sent_at DESC, message_id DESC);

CREATE TABLE IF NOT EXISTS direct_message_reads (
    owner_id VARCHAR(72) NOT NULL,
    peer_id VARCHAR(72) NOT NULL,
    message_id VARCHAR(96) NOT NULL,
    sent_at BIGINT NOT NULL,
    PRIMARY KEY (owner_id, peer_id),
    CHECK (owner_id <> peer_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    notification_id VARCHAR(96) PRIMARY KEY,
    player_id VARCHAR(72) NOT NULL,
    title VARCHAR(80) NOT NULL,
    body VARCHAR(240) NOT NULL,
    deep_link TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS notifications_player_time_idx
    ON notifications (player_id, created_at DESC, notification_id DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    player_id VARCHAR(72) NOT NULL,
    device_id VARCHAR(96) NOT NULL,
    platform VARCHAR(8) NOT NULL,
    token TEXT NOT NULL,
    token_sha256 CHAR(64) NOT NULL UNIQUE,
    revision VARCHAR(96) NOT NULL,
    registered_at_ms BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (player_id, device_id),
    CHECK (platform IN ('android', 'ios'))
);

CREATE TABLE IF NOT EXISTS player_reports (
    report_id VARCHAR(96) PRIMARY KEY,
    reporter_id VARCHAR(72) NOT NULL,
    target_id VARCHAR(72) NOT NULL,
    reason VARCHAR(40) NOT NULL,
    detail VARCHAR(500) NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'queued'
);
CREATE INDEX IF NOT EXISTS player_reports_target_time_idx
    ON player_reports (target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS invite_codes (
    code VARCHAR(32) PRIMARY KEY,
    inviter_id VARCHAR(72) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    CHECK (uses >= 0),
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS invite_codes_inviter_idx
    ON invite_codes (inviter_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS oauth_exchanges (
    exchange_hash CHAR(64) PRIMARY KEY,
    player_id VARCHAR(72) NOT NULL,
    provider VARCHAR(16) NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS oauth_exchanges_expiry_idx
    ON oauth_exchanges (expires_at);
