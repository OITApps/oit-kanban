import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkAndReserve, computeIdempotencyKey } from "../idempotency.js";
import { SqliteStore } from "../state/sqlite-store.js";

let store: SqliteStore;

beforeEach(() => {
	store = new SqliteStore(":memory:");
	// Seed a parent card so FK is satisfied.
	store.upsertCard({
		cardId: "card-idem",
		status: "active",
		lastSeenAt: Date.now(),
		currentAttemptId: null,
		blockerCount: 0,
	});
});

afterEach(() => {
	store.close();
});

describe("computeIdempotencyKey", () => {
	it("returns a 64-character hex string (sha256)", () => {
		const key = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 1, runnerKind: "claude" });
		expect(key).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic for the same inputs", () => {
		const a = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 1, runnerKind: "claude" });
		const b = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 1, runnerKind: "claude" });
		expect(a).toBe(b);
	});

	it("differs when any input changes", () => {
		const base = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 1, runnerKind: "claude" });
		const diffAttempt = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 2, runnerKind: "claude" });
		const diffKind = computeIdempotencyKey({ cardId: "card-001", attemptNumber: 1, runnerKind: "codex" });
		expect(diffAttempt).not.toBe(base);
		expect(diffKind).not.toBe(base);
	});
});

describe("checkAndReserve", () => {
	it("returns true when key is new", () => {
		const key = computeIdempotencyKey({ cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" });
		const result = checkAndReserve(store, { key, cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" });
		expect(result).toBe(true);
	});

	it("returns false when key already exists (second reservation)", () => {
		const key = computeIdempotencyKey({ cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" });
		const args = { key, cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" };
		expect(checkAndReserve(store, args)).toBe(true);
		expect(checkAndReserve(store, args)).toBe(false);
	});

	it("allows different attempt numbers to reserve independently", () => {
		const args1 = {
			key: computeIdempotencyKey({ cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" }),
			cardId: "card-idem",
			attemptNumber: 1,
			runnerKind: "claude",
		};
		const args2 = {
			key: computeIdempotencyKey({ cardId: "card-idem", attemptNumber: 2, runnerKind: "claude" }),
			cardId: "card-idem",
			attemptNumber: 2,
			runnerKind: "claude",
		};
		expect(checkAndReserve(store, args1)).toBe(true);
		expect(checkAndReserve(store, args2)).toBe(true);
	});
});
