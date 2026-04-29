-- Symphony §4.1.8 state schema for oit-kanban dispatcher.
-- Managed by SqliteStore.runMigrations() via better-sqlite3.

CREATE TABLE IF NOT EXISTS issues (
  card_id          TEXT    PRIMARY KEY,
  status           TEXT    NOT NULL DEFAULT 'active',
  last_seen_at     INTEGER NOT NULL,
  current_attempt_id TEXT  NULL,
  blocker_count    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
  id               TEXT    PRIMARY KEY,
  card_id          TEXT    NOT NULL REFERENCES issues(card_id) ON DELETE CASCADE,
  attempt_number   INTEGER NOT NULL,
  runner_kind      TEXT    NOT NULL,
  started_at       INTEGER NOT NULL,
  ended_at         INTEGER NULL,
  result           TEXT    NULL CHECK (result IN ('success','fail','stalled','cancelled')),
  idempotency_key  TEXT    NOT NULL UNIQUE,
  input_tokens     INTEGER NOT NULL DEFAULT 0,
  output_tokens    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attempts_card_id ON attempts(card_id);
CREATE INDEX IF NOT EXISTS idx_attempts_active   ON attempts(card_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default kill-switch value (idempotent).
INSERT OR IGNORE INTO settings(key, value) VALUES ('paused', 'false');
