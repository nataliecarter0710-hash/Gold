# Executable contract checks (database-free)

## Run
From the repository root, with Python 3.10+:

```sh
python3 tests/virtual-bets-staging-contract-tests.py
```

The script uses only the Python standard library and prints individual unittest
PASS/FAIL results. No database URL, secrets, network, Supabase, Render, or
external dependencies are required.

## Coverage
- Valid and invalid round-state paths and cancellation/terminal-state behavior.
- Initial result record, review correction with a reason, and version/history preservation.
- Same-key/same-payload retry reuse, changed-payload conflict, per-user key scope.
- Concurrent in-process duplicate requests and competing payloads using two threads.
- Synthetic user visibility isolation.
- Snapshot retention and checks that modeled balances/ledger remain unchanged.

## Important limits
These are **executable design-contract/model checks**, not integration tests of the
repository's PostgreSQL schema or code. The concurrency test exercises a Python
lock, not PostgreSQL unique constraints or transaction isolation. The access test
models visibility, not real Supabase/PostgreSQL RLS or grants. It cannot establish
that actual application paths are secure. These real database checks remain
blocked until a newly approved disposable database target is provisioned and
reviewed. Never point this script at a database; it does not accept one.

## Safety
This script is database-free and has no operational betting, balance, ledger,
payout or settlement calls.
