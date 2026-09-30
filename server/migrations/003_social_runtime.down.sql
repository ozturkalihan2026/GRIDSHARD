-- Destructive rollback. Run only with an independently verified backup and
-- the migration tool's explicit --allow-destructive flag.
DROP TABLE IF EXISTS oauth_exchanges;
DROP TABLE IF EXISTS invite_codes;
DROP TABLE IF EXISTS player_reports;
DROP TABLE IF EXISTS push_subscriptions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS direct_message_reads;
DROP TABLE IF EXISTS direct_messages;
DROP TABLE IF EXISTS player_blocks;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS platform_accounts;
