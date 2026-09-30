-- Destructive rollback: only with an independent verified backup and an
-- explicit --allow-destructive migration invocation.
DROP TABLE IF EXISTS store_notifications;
DROP TABLE IF EXISTS store_receipts;
