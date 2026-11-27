# Supabase Function Exposure Finding — 2026-11-28

Read-only inspection of project Goldbet9-Staging.

## High-risk finding
The public function `public.transfer_virtual_coins(p_from_user uuid, p_to_user uuid, p_amount numeric, p_idempotency_key text, p_note text)` exists and is executable by both `anon` and `authenticated` roles (checked with `has_function_privilege`).

Its body performs sender balance deduction, recipient balance credit and ledger insertion in `public.platform_users` / `public.coin_ledger`. It has no SECURITY DEFINER flag (security_definer=false). The function uses caller-supplied user IDs and amount, and the read-only inspection did not establish authorization checks restricting callers to permitted transfers.

## Action taken
No invocation, account seeding, transaction, grant change, or migration was performed. This is a finding, not an exploit test.

## Recommendation
Treat the function as unsafe and keep it unused/isolated until an authorized security review establishes a safe permission model and validation. Do not expose it to client calls. Review ACLs and role-specific table access before any operational use.
