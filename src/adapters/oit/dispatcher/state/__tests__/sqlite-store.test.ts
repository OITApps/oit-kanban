import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SqliteStore } from "../sqlite-store.js";

let store: SqliteStore;

beforeEach(() => {
	store = new SqliteStore(":memory:");
});

afterEach(() => {
	store.close();
});

describe("SqliteStore — issues", () => {
	it("returns null for an unknown cardId", () => {
		expect(store.getCard("nonexistent")).toBeNull();
	});

	it("upserts and retrieves a card", () => {
		store.upsertCard({
			cardId: "card-001",
			status: "active",
			lastSeenAt: 1_000_000,
			currentAttemptId: null,
			blockerCount: 0,
		});
		const card = store.getCard("card-001");
		expect(card?.status).toBe("active");
		expect(card?.blockerCount).toBe(0);
	});

	it("updates an existing card on re-upsert", () => {
		store.upsertCard({
			cardId: "card-002",
			status: "active",
			lastSeenAt: 1000,
			currentAttemptId: null,
			blockerCount: 0,
		});
		store.upsertCard({
			cardId: "card-002",
			status: "done",
			lastSeenAt: 2000,
			currentAttemptId: null,
			blockerCount: 1,
		});
		const card = store.getCard("card-002");
		expect(card?.status).toBe("done");
		expect(card?.blockerCount).toBe(1);
	});
});

describe("SqliteStore — attempts", () => {
	it("records an attempt and retrieves active attempts", () => {
		store.upsertCard({
			cardId: "card-003",
			status: "active",
			lastSeenAt: 1000,
			currentAttemptId: null,
			blockerCount: 0,
		});
		store.recordAttempt({
			id: "attempt-001",
			cardId: "card-003",
			attemptNumber: 1,
			runnerKind: "claude",
			startedAt: 1000,
			endedAt: null,
			result: null,
			idempotencyKey: "ikey-001",
			inputTokens: 0,
			outputTokens: 0,
		});
		const active = store.getActiveAttempts();
		expect(active).toHaveLength(1);
		expect(active[0]?.id).toBe("attempt-001");
	});

	it("does not include completed attempts in getActiveAttempts", () => {
		store.upsertCard({
			cardId: "card-004",
			status: "active",
			lastSeenAt: 1000,
			currentAttemptId: null,
			blockerCount: 0,
		});
		store.recordAttempt({
			id: "attempt-002",
			cardId: "card-004",
			attemptNumber: 1,
			runnerKind: "claude",
			startedAt: 1000,
			endedAt: 2000,
			result: "success",
			idempotencyKey: "ikey-002",
			inputTokens: 100,
			outputTokens: 50,
		});
		expect(store.getActiveAttempts()).toHaveLength(0);
	});
});

describe("SqliteStore — kill switch", () => {
	it("is not paused by default", () => {
		expect(store.isPaused()).toBe(false);
	});

	it("pauses and unpauses the dispatcher", () => {
		store.pauseDispatcher(true);
		expect(store.isPaused()).toBe(true);
		store.pauseDispatcher(false);
		expect(store.isPaused()).toBe(false);
	});
});
