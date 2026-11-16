DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM player_reward_entitlements LIMIT 1) THEN
        RAISE EXCEPTION 'Reward rights or delivery witnesses exist; refuse destructive downgrade';
    END IF;
END;
$$;

DROP TABLE player_reward_entitlements;
