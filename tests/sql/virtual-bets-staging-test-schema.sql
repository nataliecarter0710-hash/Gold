-- Disposable test-only schema; never install in application schemas.
CREATE SCHEMA test_validation;
CREATE TABLE test_validation.platform_users (
 id uuid PRIMARY KEY, auth_uid uuid UNIQUE NOT NULL
);
CREATE TABLE test_validation.rounds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game_code text NOT NULL, round_code text NOT NULL,
 status text NOT NULL DEFAULT 'CREATED' CHECK(status IN ('CREATED','OPEN','CLOSED','RESULT_RECORDED','REVIEW','COMPLETE','CANCELLED')),
 result_payload jsonb, result_version int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(game_code,round_code)
);
CREATE TABLE test_validation.result_history(
 round_id uuid NOT NULL REFERENCES test_validation.rounds(id) ON DELETE RESTRICT,
 version int NOT NULL, payload jsonb NOT NULL, actor_uid uuid NOT NULL, reason text NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(round_id,version)
);
CREATE TABLE test_validation.bets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), round_id uuid NOT NULL REFERENCES test_validation.rounds(id) ON DELETE RESTRICT,
 platform_user_id uuid NOT NULL REFERENCES test_validation.platform_users(id) ON DELETE RESTRICT,
 game_code text NOT NULL, selection_code text NOT NULL, selection_snapshot jsonb NOT NULL,
 stake numeric(18,2) NOT NULL CHECK(stake>0), status text NOT NULL CHECK(status IN
 ('PENDING','ACCEPTED_SIMULATION','CANCELLED','RESULT_RECORDED','WON_SIMULATION','LOST_SIMULATION','VOID_SIMULATION')),
 payout_rule_snapshot jsonb NOT NULL,result_snapshot jsonb, idempotency_key text NOT NULL,
 request_payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(platform_user_id,idempotency_key)
);
CREATE FUNCTION test_validation.round_transition_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status=OLD.status THEN RETURN NEW; END IF;
 IF NOT ((OLD.status='CREATED' AND NEW.status IN ('OPEN','CANCELLED')) OR
 (OLD.status='OPEN' AND NEW.status IN ('CLOSED','CANCELLED')) OR
 (OLD.status='CLOSED' AND NEW.status IN ('RESULT_RECORDED','REVIEW','CANCELLED')) OR
 (OLD.status='RESULT_RECORDED' AND NEW.status IN ('REVIEW','COMPLETE')) OR
 (OLD.status='REVIEW' AND NEW.status IN ('RESULT_RECORDED','CANCELLED'))) THEN
 RAISE EXCEPTION 'invalid round transition % -> %',OLD.status,NEW.status;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER round_transition BEFORE UPDATE OF status ON test_validation.rounds
 FOR EACH ROW EXECUTE FUNCTION test_validation.round_transition_guard();
CREATE FUNCTION test_validation.result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.result_payload IS NOT NULL AND NEW.result_payload IS DISTINCT FROM OLD.result_payload THEN
  IF OLD.status <> 'REVIEW' OR NEW.status <> 'RESULT_RECORDED' OR NEW.result_version <= OLD.result_version THEN
   RAISE EXCEPTION 'result correction requires REVIEW and increasing version';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER result_immutability BEFORE UPDATE ON test_validation.rounds
 FOR EACH ROW EXECUTE FUNCTION test_validation.result_guard();
CREATE FUNCTION test_validation.capture_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.result_payload IS NOT NULL AND (OLD.result_payload IS DISTINCT FROM NEW.result_payload) THEN
 INSERT INTO test_validation.result_history(round_id,version,payload,actor_uid,reason)
 VALUES(NEW.id,NEW.result_version,NEW.result_payload,coalesce(auth.uid(),gen_random_uuid()),
 coalesce(current_setting('test.correction_reason',true),'initial record'));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER result_history_capture AFTER UPDATE ON test_validation.rounds
 FOR EACH ROW EXECUTE FUNCTION test_validation.capture_result();
ALTER TABLE test_validation.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_validation.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_validation.result_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_validation.bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_platform_identity ON test_validation.platform_users FOR SELECT USING(auth_uid=auth.uid());
CREATE POLICY own_bets_read ON test_validation.bets FOR SELECT USING(platform_user_id IN
 (SELECT id FROM test_validation.platform_users WHERE auth_uid=auth.uid()));
CREATE POLICY round_read_authenticated ON test_validation.rounds FOR SELECT TO authenticated USING(true);
CREATE POLICY history_read_authenticated ON test_validation.result_history FOR SELECT TO authenticated USING(true);
GRANT USAGE ON SCHEMA test_validation TO authenticated,anon;
GRANT SELECT ON test_validation.platform_users,test_validation.bets,test_validation.rounds,test_validation.result_history TO authenticated;
REVOKE ALL ON test_validation.bets,test_validation.rounds,test_validation.result_history,test_validation.platform_users FROM anon;
REVOKE INSERT,UPDATE,DELETE ON test_validation.bets,test_validation.rounds,test_validation.result_history,test_validation.platform_users FROM authenticated;
