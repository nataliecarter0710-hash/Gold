# Pre-launch Readiness Checklist — Simulation Staging

**Scope:** Synthetic sample data only. This checklist is a readiness gate, not a release approval. Keep real wagering, debits, credits, and payouts disabled.

## 1. Synthetic UI and foldable-device verification
- [ ] Confirm every displayed record is clearly marked/sample-only and contains no real user or financial data.
- [ ] Test the lobby/history at narrow phone, unfolded phone, tablet, and desktop widths.
- [ ] Verify no horizontal overflow, clipping, or overlapping controls; inspect long game names, selections, rules, results, and review notes.
- [ ] Verify search, filters, counts, empty states, loading/error fallback, and keyboard/accessibility focus.
- [ ] Confirm review history and snapshots remain readable and do not imply actual settlement.
- [ ] Perform real-device Android/Fold visual and interaction checks; source-level checks alone are insufficient.

## 2. Backend and API wiring
- [ ] Document the exact intended API routes, payloads, authentication, authorization, and error behavior.
- [ ] Verify UI/API wiring against synthetic fixtures and a clearly isolated test environment.
- [ ] Ensure responses and logs contain no secrets or personal data.
- [ ] Confirm no live wagering, balance mutation, debit, credit, payout, or production integration path is enabled.
- [ ] Verify environment configuration and feature flags fail closed.

## 3. Database security, RLS, idempotency, and concurrency
- [ ] Review policies for every relevant table, including ownership/tenant isolation, privilege grants, and anonymous access.
- [ ] Verify RLS policies with tests for authorized, unauthorized, cross-tenant, and anonymous cases.
- [ ] Test duplicate requests and retries for idempotency.
- [ ] Test concurrent requests and race conditions with deterministic test cases.
- [ ] Review round-state transitions, reconciliation rules, audit/review history, and invalid transitions.
- [ ] Capture reproducible evidence; do not treat UI tests or source inspection as proof of database controls.
- [ ] Obtain independent review before any real-data or production use.

## 4. Release and compliance checks
- [ ] Confirm scope, deployment target, branch, version, rollback plan, and change review.
- [ ] Confirm no production services, databases, or live integrations are changed without explicit authorization.
- [ ] Review jurisdiction-specific legal, privacy, age, accessibility, and responsible-use requirements with qualified counsel/compliance reviewers.
- [ ] Check user-facing notices and ensure the experience cannot be mistaken for real-money wagering.
- [ ] Complete final acceptance, monitoring, incident/rollback readiness, and sign-off.
- [ ] Keep this simulation-only staging work separate from any production launch approval.

**Status:** Not launch-approved. Items must be evidenced and signed off before a release decision.
