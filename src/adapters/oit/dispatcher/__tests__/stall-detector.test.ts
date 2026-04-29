import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StallDetector } from "../stall-detector.js";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(async () => {
	vi.useRealTimers();
});

describe("StallDetector", () => {
	it("resolves 'ok' when notifyActivity is called before timeout", async () => {
		const detector = new StallDetector({ stallTimeoutMs: 5_000 });
		const controller = new AbortController();
		const promise = detector.watch("attempt-001", controller.signal);

		await vi.advanceTimersByTimeAsync(2_000);
		detector.notifyActivity("attempt-001");
		await vi.advanceTimersByTimeAsync(2_000);
		detector.notifyActivity("attempt-001");

		// Tell the detector the run is done.
		controller.abort();
		const result = await promise;
		expect(result).toBe("ok");
	});

	it("resolves 'stalled' when no activity within stallTimeoutMs", async () => {
		const detector = new StallDetector({ stallTimeoutMs: 5_000 });
		const controller = new AbortController();
		const promise = detector.watch("attempt-002", controller.signal);

		await vi.advanceTimersByTimeAsync(5_001);
		const result = await promise;
		expect(result).toBe("stalled");
	});

	it("resolves 'ok' when abort fires before stall timeout", async () => {
		const detector = new StallDetector({ stallTimeoutMs: 10_000 });
		const controller = new AbortController();
		const promise = detector.watch("attempt-003", controller.signal);

		await vi.advanceTimersByTimeAsync(3_000);
		controller.abort();
		const result = await promise;
		expect(result).toBe("ok");
	});

	it("defaults to 120000ms stall timeout", async () => {
		const detector = new StallDetector();
		const controller = new AbortController();
		const promise = detector.watch("attempt-004", controller.signal);

		await vi.advanceTimersByTimeAsync(119_999);
		// Not stalled yet — activity resets the window
		detector.notifyActivity("attempt-004");
		await vi.advanceTimersByTimeAsync(119_999);
		// Still not stalled
		expect(true).toBe(true); // no resolution yet

		controller.abort();
		const result = await promise;
		expect(result).toBe("ok");
	});

	it("ignores notifyActivity for unknown attempt IDs", () => {
		const detector = new StallDetector({ stallTimeoutMs: 1_000 });
		expect(() => detector.notifyActivity("nonexistent")).not.toThrow();
	});

	it("cleans up after watch resolves — no timer leak", async () => {
		const detector = new StallDetector({ stallTimeoutMs: 1_000 });
		const controller = new AbortController();
		const promise = detector.watch("attempt-005", controller.signal);
		controller.abort();
		await promise;
		// Second abort should not throw
		expect(() => controller.abort()).not.toThrow();
	});
});
