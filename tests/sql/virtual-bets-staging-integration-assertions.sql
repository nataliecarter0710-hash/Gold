-- Manual/transactional role probes for the isolated harness. NOT executed in this follow-up.
-- First provision schema from virtual-bets-staging-test-schema.sql and create fake fixtures as owner.
-- Required fixtures: two auth UUIDs A/B, platform user rows mapped to them, two open rounds.
-- Run in separate transactions/sessions to avoid role/claim leakage.

-- Example restricted-role probe (adapt fixture UUIDs):
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','<A-auth-uuid>',true);
-- Assert A sees only A's bet rows:
SELECT count(*) FROM test_validation.bets; -- expected A-owned rows only
SELECT count(*) FROM test_validation.bets WHERE platform_user_id='<B-platform-user-uuid>'; -- expected 0
-- Direct client writes must fail with permission error:
-- INSERT/UPDATE/DELETE test_validation.bets ... (expected denied)
ROLLBACK;

-- Repeat using B subject; verify A's rows invisible.
-- Switch to anon and verify protected reads are denied/empty and writes are denied.

-- Retry resolver tests under authenticated A:
-- identical parameters/payload twice => identical returned bet ID and one row.
-- same key but altered request_payload => SQLSTATE 22023 conflict, existing row untouched.
-- authenticated B may independently use A's key.
-- Never count owner-role or bypass-role queries as RLS proof.
