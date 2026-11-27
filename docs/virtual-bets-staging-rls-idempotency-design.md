# RLS and retry-resolver gap closure (design/tests only)

Branch: `feat/virtual-bets-staging`

## RLS policy shape
- Fixture maps synthetic `auth.uid()` values to platform-user IDs.
- Platform identity rows: authenticated SELECT only when `auth_uid = auth.uid()`.
- Bets: authenticated SELECT only for the mapped own platform-user ID.
- Round and result-history visibility is deliberately separate and test-scoped; this harness grants authenticated read visibility to these records, not production guidance.
- No direct client INSERT, UPDATE, or DELETE grants on fixture tables for anon or authenticated. The retry resolver is the only write-shaped entry point in this disposable harness.
- Tests must switch to restricted roles and synthetic JWT subject claims, never count owner/bypass-role observations as RLS proof.

## Idempotent retry rule
The resolver scopes uniqueness to (platform user, idempotency key), inserts with conflict-safe handling, then compares the stored normalized JSON payload:
- Same user/key/payload: return original record, no duplicate.
- Same user/key/different payload: raise conflict and preserve original.
- Different user: keys are independent.
Production must define payload normalization and include every material request field. This test resolver is not production code.

## Test protocol (requires isolated Supabase-compatible PostgreSQL)
1. Create synthetic A/B users and rows as privileged setup.
2. Switch to `authenticated`, set `request.jwt.claim.sub` to A; assert A sees A rows and B rows are invisible, including ID/filter queries. Repeat inversely for B.
3. Switch to `anon`; protected reads should be denied/empty as appropriate and writes denied.
4. As authenticated, direct INSERT/UPDATE/DELETE attempts on fixture tables must fail due to grants.
5. A calls resolver twice with same payload/key; assert same ID and row count one. Changed payload for that key must raise conflict and preserve original.
6. B uses the same key successfully in their own namespace.
7. Owner/bypass role is setup/diagnostic only, not proof of RLS.

The SQL assertions are not run in this revision because the project used in the earlier integration run is paused and this request expressly prohibits unpausing/modifying either throwaway. No live database has been used for this follow-up.
