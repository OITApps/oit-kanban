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
	it("returns reserved=true and the key when input is new", () => {
		const result = checkAndReserve(store, {
			cardId: "card-idem",
			attemptNumber: 1,
			runnerKind: "claude",
		});
		expect(result.reserved).toBe(true);
		expect(result.key).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns reserved=false (still with the key) when input is a duplicate", () => {
		const input = { cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" };
		const first = checkAndReserve(store, input);
		expect(first.reserved).toBe(true);
		const second = checkAndReserve(store, input);
		expect(second.reserved).toBe(false);
		expect(second.key).toBe(first.key);
	});

	it("allows different attempt numbers to reserve independently", () => {
		const r1 = checkAndReserve(store, { cardId: "card-idem", attemptNumber: 1, runnerKind: "claude" });
		const r2 = checkAndReserve(store, { cardId: "card-idem", attemptNumber: 2, runnerKind: "claude" });
		expect(r1.reserved).toBe(true);
		expect(r2.reserved).toBe(true);
		expect(r1.key).not.toBe(r2.key);
	});

	it("re-throws non-UNIQUE errors (e.g. FK violation when parent card missing)", () => {
		expect(() =>
			checkAndReserve(store, {
				cardId: "card-does-not-exist",
				attemptNumber: 1,
				runnerKind: "claude",
			}),
		).toThrow(/FOREIGN KEY constraint failed/);
	});
});
