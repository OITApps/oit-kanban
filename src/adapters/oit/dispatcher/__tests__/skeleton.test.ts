import { describe, expect, it } from "vitest";
import { createDispatcher, type DispatcherCard, type DispatcherState, type RunSpec } from "../index.js";

describe("dispatcher skeleton", () => {
	it("exports DispatcherCard type (structural check via object)", () => {
		const card: DispatcherCard = {
			cardId: "card-abc",
			status: "active",
			lastSeenAt: Date.now(),
			currentAttemptId: null,
			blockerCount: 0,
		};
		expect(card.cardId).toBe("card-abc");
	});

	it("exports DispatcherState type (structural check)", () => {
		const state: DispatcherState = { paused: false, maxConcurrent: 2 };
		expect(state.paused).toBe(false);
	});

	it("exports RunSpec type (structural check)", () => {
		const spec: RunSpec = {
			cardId: "card-abc",
			attemptNumber: 1,
			runnerKind: "claude",
			idempotencyKey: "aabbcc",
		};
		expect(spec.runnerKind).toBe("claude");
	});

	it("createDispatcher returns an object with expected shape", () => {
		const d = createDispatcher({ dbPath: ":memory:", maxConcurrent: 2 });
		expect(d).toHaveProperty("start");
		expect(d).toHaveProperty("stop");
		expect(typeof d.start).toBe("function");
		expect(typeof d.stop).toBe("function");
	});
});
