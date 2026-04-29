import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConcurrencyGate } from "../concurrency.js";
import { SqliteStore } from "../state/sqlite-store.js";

let store: SqliteStore;

function seedCard(cardId: string): void {
	store.upsertCard({ cardId, status: "active", lastSeenAt: Date.now(), currentAttemptId: null, blockerCount: 0 });
}

beforeEach(() => {
	store = new SqliteStore(":memory:");
});

afterEach(() => {
	store.close();
});

describe("ConcurrencyGate", () => {
	it("allows first acquire when no active attempts exist", () => {
		seedCard("card-a");
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(gate.acquire("card-a")).toBe(true);
	});

	it("allows second acquire when under cap", () => {
		seedCard("card-a");
		seedCard("card-b");
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(gate.acquire("card-a")).toBe(true);
		expect(gate.acquire("card-b")).toBe(true);
	});

	it("refuses third acquire when cap is 2", () => {
		seedCard("card-a");
		seedCard("card-b");
		seedCard("card-c");
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(gate.acquire("card-a")).toBe(true);
		expect(gate.acquire("card-b")).toBe(true);
		expect(gate.acquire("card-c")).toBe(false);
	});

	it("allows a new acquire after release frees a slot", () => {
		seedCard("card-a");
		seedCard("card-b");
		seedCard("card-c");
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(gate.acquire("card-a")).toBe(true);
		expect(gate.acquire("card-b")).toBe(true);
		gate.release("card-a");
		expect(gate.acquire("card-c")).toBe(true);
	});

	it("defaults maxConcurrent to 2 when not specified", () => {
		seedCard("card-a");
		seedCard("card-b");
		seedCard("card-c");
		const gate = new ConcurrencyGate({ store });
		expect(gate.acquire("card-a")).toBe(true);
		expect(gate.acquire("card-b")).toBe(true);
		expect(gate.acquire("card-c")).toBe(false);
	});

	it("does not throw when release() is called for a card that was never acquired", () => {
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(() => gate.release("never-acquired")).not.toThrow();
	});

	it("allows the same cardId to acquire again after a release (retry pattern)", () => {
		seedCard("card-a");
		const gate = new ConcurrencyGate({ maxConcurrent: 2, store });
		expect(gate.acquire("card-a")).toBe(true);
		gate.release("card-a");
		expect(gate.acquire("card-a")).toBe(true);
	});

	it("refuses re-acquire of the same cardId before release (prevents stub leak)", () => {
		seedCard("card-a");
		const gate = new ConcurrencyGate({ maxConcurrent: 5, store });
		expect(gate.acquire("card-a")).toBe(true);
		expect(gate.acquire("card-a")).toBe(false);
		// Verify only ONE active attempt was created (no leak)
		expect(store.getActiveAttempts()).toHaveLength(1);
	});
});
