import { randomUUID } from "node:crypto";
import type { SqliteStore } from "./state/sqlite-store.js";

export interface ConcurrencyGateOptions {
	maxConcurrent?: number;
	store: SqliteStore;
}

/**
 * Enforces a cap on simultaneous in-flight dispatcher runs.
 * acquire() checks the live count from SQLite; release() marks ended_at.
 *
 * Maintains an in-memory map of cardId → attemptId so release() can close
 * the right row without requiring the caller to track the attempt ID.
 */
export class ConcurrencyGate {
	private readonly maxConcurrent: number;
	private readonly store: SqliteStore;
	/** cardId → attempt id for in-flight acquires this instance issued. */
	private readonly inflight = new Map<string, string>();

	constructor(opts: ConcurrencyGateOptions) {
		this.maxConcurrent = opts.maxConcurrent ?? 2;
		this.store = opts.store;
	}

	/**
	 * Returns true and records a stub attempt row if under the concurrency cap.
	 * Returns false if at or above cap — caller must not start the run.
	 */
	acquire(cardId: string): boolean {
		const active = this.store.getActiveAttempts();
		if (active.length >= this.maxConcurrent) {
			return false;
		}

		const attemptId = randomUUID();
		this.store.recordAttempt({
			id: attemptId,
			cardId,
			attemptNumber: 0, // placeholder; overwritten by idempotency reservation
			runnerKind: "concurrency-gate",
			startedAt: Date.now(),
			endedAt: null,
			result: null,
			idempotencyKey: `gate:${attemptId}`,
			inputTokens: 0,
			outputTokens: 0,
		});
		this.inflight.set(cardId, attemptId);
		return true;
	}

	/**
	 * Marks the in-flight attempt for cardId as ended so future getActiveAttempts()
	 * no longer counts it. Safe to call even if cardId was never acquired.
	 */
	release(cardId: string): void {
		const attemptId = this.inflight.get(cardId);
		if (!attemptId) return;
		this.store.recordAttempt({
			id: attemptId,
			cardId,
			attemptNumber: 0,
			runnerKind: "concurrency-gate",
			startedAt: 0,
			endedAt: Date.now(),
			result: "cancelled",
			idempotencyKey: `gate:${attemptId}`,
			inputTokens: 0,
			outputTokens: 0,
		});
		this.inflight.delete(cardId);
	}
}
