import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { AttemptRecord, DispatcherCard } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "schema.sql");

interface IssueRow {
	card_id: string;
	status: string;
	last_seen_at: number;
	current_attempt_id: string | null;
	blocker_count: number;
}

interface AttemptRow {
	id: string;
	card_id: string;
	attempt_number: number;
	runner_kind: string;
	started_at: number;
	ended_at: number | null;
	result: string | null;
	idempotency_key: string;
	input_tokens: number;
	output_tokens: number;
}

interface SettingRow {
	value: string;
}

export class SqliteStore {
	private db: Database.Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
		this.db.pragma("journal_mode = WAL");
		this.db.pragma("foreign_keys = ON");
		this.runMigrations();
	}

	private runMigrations(): void {
		const sql = readFileSync(SCHEMA_PATH, "utf8");
		this.db.exec(sql);
	}

	getCard(cardId: string): DispatcherCard | null {
		const row = this.db
			.prepare<[string], IssueRow>(
				"SELECT card_id, status, last_seen_at, current_attempt_id, blocker_count FROM issues WHERE card_id = ?",
			)
			.get(cardId);

		if (!row) return null;
		return {
			cardId: row.card_id,
			status: row.status as DispatcherCard["status"],
			lastSeenAt: row.last_seen_at,
			currentAttemptId: row.current_attempt_id,
			blockerCount: row.blocker_count,
		};
	}

	upsertCard(card: DispatcherCard): void {
		this.db
			.prepare<DispatcherCard>(
				`INSERT INTO issues(card_id, status, last_seen_at, current_attempt_id, blocker_count)
         VALUES (@cardId, @status, @lastSeenAt, @currentAttemptId, @blockerCount)
         ON CONFLICT(card_id) DO UPDATE SET
           status             = excluded.status,
           last_seen_at       = excluded.last_seen_at,
           current_attempt_id = excluded.current_attempt_id,
           blocker_count      = excluded.blocker_count`,
			)
			.run(card);
	}

	recordAttempt(attempt: AttemptRecord): void {
		this.db
			.prepare<{
				id: string;
				cardId: string;
				attemptNumber: number;
				runnerKind: string;
				startedAt: number;
				endedAt: number | null;
				result: string | null;
				idempotencyKey: string;
				inputTokens: number;
				outputTokens: number;
			}>(
				`INSERT INTO attempts(
           id, card_id, attempt_number, runner_kind, started_at,
           ended_at, result, idempotency_key, input_tokens, output_tokens
         ) VALUES (
           @id, @cardId, @attemptNumber, @runnerKind, @startedAt,
           @endedAt, @result, @idempotencyKey, @inputTokens, @outputTokens
         )
         ON CONFLICT(id) DO UPDATE SET
           ended_at      = excluded.ended_at,
           result        = excluded.result,
           input_tokens  = excluded.input_tokens,
           output_tokens = excluded.output_tokens`,
			)
			.run({
				id: attempt.id,
				cardId: attempt.cardId,
				attemptNumber: attempt.attemptNumber,
				runnerKind: attempt.runnerKind,
				startedAt: attempt.startedAt,
				endedAt: attempt.endedAt,
				result: attempt.result,
				idempotencyKey: attempt.idempotencyKey,
				inputTokens: attempt.inputTokens,
				outputTokens: attempt.outputTokens,
			});
	}

	getActiveAttempts(): AttemptRecord[] {
		const rows = this.db.prepare<[], AttemptRow>("SELECT * FROM attempts WHERE ended_at IS NULL").all();

		return rows.map((r) => ({
			id: r.id,
			cardId: r.card_id,
			attemptNumber: r.attempt_number,
			runnerKind: r.runner_kind,
			startedAt: r.started_at,
			endedAt: r.ended_at,
			result: r.result as AttemptRecord["result"],
			idempotencyKey: r.idempotency_key,
			inputTokens: r.input_tokens,
			outputTokens: r.output_tokens,
		}));
	}

	pauseDispatcher(paused: boolean): void {
		this.db.prepare<[string]>("UPDATE settings SET value = ? WHERE key = 'paused'").run(paused ? "true" : "false");
	}

	isPaused(): boolean {
		const row = this.db.prepare<[string], SettingRow>("SELECT value FROM settings WHERE key = ?").get("paused");
		return row?.value === "true";
	}

	close(): void {
		this.db.close();
	}
}
