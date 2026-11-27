# Goldbet9 Supabase Read-only Security Review — 2026-11-27

Scope: read-only review of public-schema table grants, RLS policies, and public-schema functions for the connected Goldbet9-Staging Supabase project. No database changes were made.

## Table grants observed
- No grants to `anon` or `PUBLIC` were returned for public-schema tables in the queried privileges.
- `authenticated` has SELECT grants on four tables: `game_catalog`, `game_sessions`, `profiles`, and `tenant_memberships`.
- The reported `service_role` table privileges include REFERENCES, TRIGGER, and TRUNCATE. This output is not a complete effective-permission analysis and does not establish the absence of other privileges inherited via role membership.

## RLS policies observed (4)
- `game_catalog`: authenticated SELECT only when `enabled = true`.
- `game_sessions`: authenticated SELECT where an active membership exists for the same tenant and auth.uid().
- `profiles`: authenticated SELECT where `user_id = auth.uid()`.
- `tenant_memberships`: authenticated SELECT where `user_id = auth.uid()` and `active = true`.

All eight public tables previously confirmed RLS enabled; FORCE RLS was not enabled on any of the eight at that check.

## Function reviewed
`public.rls_auto_enable()` is an event-trigger function, SECURITY DEFINER, with `search_path=pg_catalog`. Its body attempts to enable RLS on newly created tables in public schema. The exception handler catches all exceptions and logs a generic failure, meaning this automation is not a substitute for verifying RLS after schema changes. The event-trigger registration and owner/permissions still require separate review.

## Next read-only review items
1. Verify event-trigger registration and enabled status.
2. Review role membership, schema privileges, function execute grants, and default privileges.
3. Verify each table's owner and whether FORCE RLS is appropriate for its use.
4. Review policies for coverage of all intended access paths; no write policies were observed in the policy listing.
5. Never expose service-role credentials or database secrets in repository files.

## Scope / limitations
This is a point-in-time metadata review, not a penetration test or legal/compliance certification. No wagering, settlement, payout, or gambling-operation functionality was changed or activated.
