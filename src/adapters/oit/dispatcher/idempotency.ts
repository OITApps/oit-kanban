import { createHash, randomUUID } from "node:crypto";
import type { SqliteStore } from "./state/sqlite-store.js";

export interface IdempotencyInput {
	cardId: string;
	attemptNumber: number;
	runnerKind: string;
}

/**
 * sha256(cardId + ":" + attemptNumber + ":" + runnerKind) as hex.
 * Deterministic — safe to recompute at any point for the same logical attempt.
 */
export function computeIdempotencyKey(input: IdempotencyInput): string {
	const payload = `${input.cardId}:${input.attemptNumber}:${input.runnerKind}`;
	return createHash("sha256").update(payload).digest("hex");
}

/**
 * Attempt to reserve the idempotency key by inserting a stub attempt row.
 * Computes the key internally from `input` to eliminate caller mismatch hazards.
 *
 * Returns { reserved: true, key } when the key was new and the row was inserted.
 * Returns { reserved: false, key } when a UNIQUE constraint fires — key still
 * returned so downstream pipeline can reference it without recomputing.
 *
 * Uses INSERT OR ABORT so the unique constraint violation is handled without
 * poisoning any outer transaction.
 */
export function checkAndReserve(store: SqliteStore, input: IdempotencyInput): { reserved: boolean; key: string } {
	const key = computeIdempotencyKey(input);
	try {
		store.recordAttempt({
			id: randomUUID(),
			cardId: input.cardId,
			attemptNumber: input.attemptNumber,
			runnerKind: input.runnerKind,
			startedAt: Date.now(),
			endedAt: null,
			result: null,
			idempotencyKey: key,
			inputTokens: 0,
			outputTokens: 0,
		});
		return { reserved: true, key };
	} catch (err) {
		// better-sqlite3 throws SqliteError with .code === "SQLITE_CONSTRAINT_UNIQUE"
		// for the UNIQUE(idempotency_key) constraint. Fall back to message match for
		// resilience against future error class changes.
		const code = (err as { code?: string }).code;
		const msg = err instanceof Error ? err.message : String(err);
		if (code === "SQLITE_CONSTRAINT_UNIQUE" || msg.includes("UNIQUE") || msg.includes("unique")) {
			return { reserved: false, key };
		}
		throw err;
	}
}
