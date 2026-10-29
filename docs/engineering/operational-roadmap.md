# Operational roadmap

## Phase 0 — completed in this branch

- Read-only baseline of repository, live schema, migrations, tables, policies, triggers, and Edge Functions.
- Documented notification paths, schema drift, parallel table families, and evidence limits.
- No production or database writes.

## Phase 1 — in progress

- Correct Web Push persistence to match the live schema.
- Preserve both notification paths while documenting overlap.
- Add acceptance coverage for normalized subscriptions and authorization at the route boundary where the project test harness exists.
- Prepare, but do not apply, a notification idempotency migration after duplicate analysis.

## Phase 2 — next

1. Reconcile repository SQL scripts with the six live migration records and live schema.
2. Review each public grant, RLS policy, view, and `SECURITY DEFINER` function by consumer.
3. Export and version the active Edge Function source.
4. Produce separately reviewed migrations for access controls and notification dedupe; apply only after approval and backup/rollback planning.

## Phase 3 — later

- Trace responsibility-score cron and RPC execution with read-only logs and an isolated reproduction.
- Separate deterministic responsibility scores from AI qualitative assessments and design resumable batches.

## Phase 4 — later

- Map parallel models to screens, API routes, triggers, and data owners; only then choose keep, migrate, or deprecate.

## Phase 5/6 — later

- Use query evidence before index/RLS optimization.
- Add operational metrics without logging message content, tokens, passwords, or secrets.
- Make lint, typecheck, tests, and build explicit CI gates; remove `ignoreBuildErrors` only after the existing errors are fixed.
