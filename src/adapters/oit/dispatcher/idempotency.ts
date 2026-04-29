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

export interface ReserveArgs extends IdempotencyInput {
	key: string;
}

/**
 * Attempt to reserve the idempotency key by inserting a stub attempt row.
 * Returns true if the key was new and the row was inserted.
 * Returns false if the key already exists (UNIQUE violation) — caller should skip.
 *
 * Uses INSERT OR ABORT so the unique constraint violation is handled without
 * poisoning any outer transaction.
 */
export function checkAndReserve(store: SqliteStore, args: ReserveArgs): boolean {
	try {
		store.recordAttempt({
			id: randomUUID(),
			cardId: args.cardId,
			attemptNumber: args.attemptNumber,
			runnerKind: args.runnerKind,
			startedAt: Date.now(),
			endedAt: null,
			result: null,
			idempotencyKey: args.key,
			inputTokens: 0,
			outputTokens: 0,
		});
		return true;
	} catch (err) {
		// UNIQUE constraint on idempotency_key — key already reserved.
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("UNIQUE") || msg.includes("unique")) {
			return false;
		}
		throw err; // unexpected error — re-raise
	}
}
