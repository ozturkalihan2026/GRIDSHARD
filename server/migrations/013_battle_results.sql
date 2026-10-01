-- Terminal facts are durable before rewards; applied marks and participant
-- projections commit with profiles/team state in the same transaction.
CREATE TABLE battle_results (
    battle_id VARCHAR(160) PRIMARY KEY,
    input_hash CHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('pending', 'applied', 'aborted')),
    account_player_ids TEXT[] NOT NULL,
    match_type VARCHAR(40) NOT NULL,
    terminal JSONB,
    summary JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    applied_at TIMESTAMPTZ,
    abort_reason VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX battle_results_pending ON battle_results (created_at, battle_id) WHERE status = 'pending';
CREATE TABLE battle_participant_results (
    battle_id VARCHAR(160) NOT NULL REFERENCES battle_results(battle_id) ON DELETE CASCADE,
    player_id VARCHAR(72) NOT NULL,
    result JSONB NOT NULL,
    PRIMARY KEY (battle_id, player_id)
);
CREATE INDEX battle_participant_history ON battle_participant_results (player_id, battle_id);
