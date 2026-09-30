-- Destructive rollback plan only. Never run against live data without a
-- verified independent backup and an explicit data-loss decision.
DROP TABLE IF EXISTS social_push_outbox;
DROP TABLE IF EXISTS social_battle_invites;
DROP TABLE IF EXISTS social_operation_receipts;
