-- Integration assertions run only on isolated project sngrsnvwbucsljwtykpa.
CREATE TEMP TABLE test_results(name text,result text,detail text);
DO $$ DECLARE r test_validation.rounds%ROWTYPE; rid uuid:=gen_random_uuid(); BEGIN
 INSERT INTO test_validation.rounds(id,game_code,round_code) VALUES(rid,'TEST','R1');
 UPDATE test_validation.rounds SET status='OPEN' WHERE rounds.id=rid;
 UPDATE test_validation.rounds SET status='CLOSED' WHERE rounds.id=rid;
 UPDATE test_validation.rounds SET result_payload='{"winner":"A"}',result_version=1,status='RESULT_RECORDED' WHERE rounds.id=rid;
 UPDATE test_validation.rounds SET status='COMPLETE' WHERE rounds.id=rid;
 INSERT INTO test_results VALUES('valid lifecycle','PASS','CREATED -> OPEN -> CLOSED -> RESULT_RECORDED -> COMPLETE');
 EXCEPTION WHEN OTHERS THEN INSERT INTO test_results VALUES('valid lifecycle','FAIL',SQLERRM); END $$;
DO $$ DECLARE rid uuid:=gen_random_uuid(); BEGIN
 INSERT INTO test_validation.rounds(id,game_code,round_code,status) VALUES(rid,'TEST','R2','CREATED');
 BEGIN UPDATE test_validation.rounds SET status='CLOSED' WHERE rounds.id=rid; RAISE EXCEPTION 'expected rejection not raised'; EXCEPTION WHEN others THEN IF SQLERRM='expected rejection not raised' THEN RAISE; END IF; END;
 INSERT INTO test_results VALUES('invalid transition','PASS','Skipped state rejected');
 EXCEPTION WHEN OTHERS THEN INSERT INTO test_results VALUES('invalid transition','FAIL',SQLERRM); END $$;
DO $$ DECLARE rid uuid:=gen_random_uuid(); BEGIN
 INSERT INTO test_validation.rounds(id,game_code,round_code,status) VALUES(rid,'TEST','R3','CLOSED');
 UPDATE test_validation.rounds SET result_payload='{"winner":"A"}',result_version=1,status='RESULT_RECORDED' WHERE rounds.id=rid;
 BEGIN UPDATE test_validation.rounds SET result_payload='{"winner":"B"}' WHERE rounds.id=rid; RAISE EXCEPTION 'expected immutable rejection not raised'; EXCEPTION WHEN others THEN IF SQLERRM='expected immutable rejection not raised' THEN RAISE; END IF; END;
 UPDATE test_validation.rounds SET status='REVIEW' WHERE rounds.id=rid;
 SET LOCAL test.correction_reason='test reviewed correction';
 UPDATE test_validation.rounds SET result_payload='{"winner":"B"}',result_version=2,status='RESULT_RECORDED' WHERE rounds.id=rid;
 IF (SELECT count(*) FROM test_validation.result_history WHERE result_history.round_id=rid AND version IN (1,2))<>2 THEN RAISE EXCEPTION 'history versions not preserved'; END IF;
 INSERT INTO test_results VALUES('result immutable/review correction','PASS','Direct overwrite rejected; REVIEW correction increments version and retains history');
 EXCEPTION WHEN OTHERS THEN INSERT INTO test_results VALUES('result immutable/review correction','FAIL',SQLERRM); END $$;
DO $$ DECLARE rid uuid:=gen_random_uuid(); uid uuid:=gen_random_uuid(); au uuid:=gen_random_uuid(); b uuid; BEGIN
 INSERT INTO test_validation.platform_users VALUES(uid,au);
 INSERT INTO test_validation.rounds(id,game_code,round_code,status) VALUES(rid,'TEST','R4','OPEN');
 INSERT INTO test_validation.bets(round_id,platform_user_id,game_code,selection_code,selection_snapshot,stake,status,payout_rule_snapshot,idempotency_key,request_payload)
 VALUES(rid,uid,'TEST','A','{"s":"a"}',10,'ACCEPTED_SIMULATION','{"rule":"x"}','key1','{"round":"R4","selection":"A","stake":10}');
 SELECT id INTO b FROM test_validation.bets WHERE platform_user_id=uid AND idempotency_key='key1';
 IF b IS NULL THEN RAISE EXCEPTION 'missing inserted row'; END IF;
 IF (SELECT selection_snapshot FROM test_validation.bets WHERE id=b) <> '{"s":"a"}'::jsonb OR (SELECT payout_rule_snapshot FROM test_validation.bets WHERE id=b) <> '{"rule":"x"}'::jsonb THEN RAISE EXCEPTION 'snapshots mismatch'; END IF;
 BEGIN INSERT INTO test_validation.bets(round_id,platform_user_id,game_code,selection_code,selection_snapshot,stake,status,payout_rule_snapshot,idempotency_key,request_payload)
 VALUES(rid,uid,'TEST','A','{"s":"a"}',10,'ACCEPTED_SIMULATION','{"rule":"x"}','key1','{"round":"R4","selection":"A","stake":10}');
 RAISE EXCEPTION 'duplicate key not rejected'; EXCEPTION WHEN unique_violation THEN END;
 BEGIN INSERT INTO test_validation.bets(round_id,platform_user_id,game_code,selection_code,selection_snapshot,stake,status,payout_rule_snapshot,idempotency_key,request_payload)
 VALUES(rid,uid,'TEST','B','{"s":"b"}',11,'ACCEPTED_SIMULATION','{"rule":"y"}','key1','{"round":"R4","selection":"B","stake":11}');
 RAISE EXCEPTION 'changed payload duplicate key not rejected'; EXCEPTION WHEN unique_violation THEN END;
 INSERT INTO test_results VALUES('unique key/snapshots','PASS','Unique key prevents duplicate insert; snapshot columns preserved (retry reuse/conflict semantics not implemented)');
 EXCEPTION WHEN OTHERS THEN INSERT INTO test_results VALUES('unique key/snapshots','FAIL',SQLERRM); END $$;
DO $$ DECLARE rid uuid:=gen_random_uuid(); uid uuid:=gen_random_uuid(); au uuid:=gen_random_uuid(); s text; BEGIN
 INSERT INTO test_validation.platform_users VALUES(uid,au);
 INSERT INTO test_validation.rounds(id,game_code,round_code,status) VALUES(rid,'TEST','R5','OPEN');
 FOREACH s IN ARRAY ARRAY['PENDING','ACCEPTED_SIMULATION','CANCELLED','RESULT_RECORDED','WON_SIMULATION','LOST_SIMULATION','VOID_SIMULATION'] LOOP
 INSERT INTO test_validation.bets(round_id,platform_user_id,game_code,selection_code,selection_snapshot,stake,status,payout_rule_snapshot,idempotency_key,request_payload)
 VALUES(rid,uid,'TEST','x','{}',1,s,'{}',s,'{}');
 END LOOP;
 INSERT INTO test_results VALUES('seven bet statuses','PASS','All documented labels accepted by test CHECK');
 EXCEPTION WHEN OTHERS THEN INSERT INTO test_results VALUES('seven bet statuses','FAIL',SQLERRM); END $$;
SELECT * FROM test_results;
