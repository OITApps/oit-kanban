# oit-kanban dispatcher

Polls ClickUp and GitHub for card state changes, enforces concurrency
caps, deduplicates retries via idempotency keys, and detects stalled runs.

## State storage

- SQLite: `~/.oit-kanban/state.db` (better-sqlite3, synchronous API)
- Audit log: `~/.oit-kanban/audit.jsonl` (append-only JSONL)

## Module layout

- `types.ts` — DispatcherCard, AttemptRecord, RunSpec, DispatcherState
- `index.ts` — createDispatcher() factory + re-exports
- `state/sqlite-store.ts` — DB wrapper (getCard, upsertCard, recordAttempt, …)
- `state/schema.sql` — DDL for issues, attempts, settings tables
- `poll-loop.ts` — PollLoop class (start/stop, setInterval-based)
- `reconcile.ts` — reconcile(cardIds[], adapters) via Stage-0 adapters
- `idempotency.ts` — computeIdempotencyKey + checkAndReserve
- `concurrency.ts` — ConcurrencyGate (acquire/release, cap enforcement)
- `stall-detector.ts` — StallDetector (watch/notifyActivity, fake-timer-friendly)

## Observability

console.log only. No Pino, no Prometheus, no OTel.
This is a local laptop tool — match ceremony to deployment surface.
