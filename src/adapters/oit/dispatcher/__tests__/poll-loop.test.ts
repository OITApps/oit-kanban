import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PollLoop } from "../poll-loop.js";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(async () => {
	vi.useRealTimers();
});

describe("PollLoop", () => {
	it("does not call tick before start()", () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		new PollLoop({ intervalMs: 1000, tick });
		vi.advanceTimersByTime(5000);
		expect(tick).not.toHaveBeenCalled();
	});

	it("calls tick on each interval after start()", async () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		const loop = new PollLoop({ intervalMs: 1000, tick });
		loop.start();
		await vi.advanceTimersByTimeAsync(3500);
		// 3 full intervals elapsed
		expect(tick).toHaveBeenCalledTimes(3);
	});

	it("stops calling tick after stop()", async () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		const loop = new PollLoop({ intervalMs: 1000, tick });
		loop.start();
		await vi.advanceTimersByTimeAsync(2500);
		await loop.stop();
		const countAfterStop = tick.mock.calls.length;
		await vi.advanceTimersByTimeAsync(3000);
		expect(tick).toHaveBeenCalledTimes(countAfterStop);
	});

	it("defaults to 5000ms interval when not specified", () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		const loop = new PollLoop({ tick });
		loop.start();
		vi.advanceTimersByTime(4999);
		expect(tick).toHaveBeenCalledTimes(0);
		vi.advanceTimersByTime(1);
		expect(tick).toHaveBeenCalledTimes(1);
	});

	it("does not throw if stop() is called without start()", async () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		const loop = new PollLoop({ tick });
		await expect(loop.stop()).resolves.toBeUndefined();
	});

	it("does not double-fire when start() is called twice", async () => {
		const tick = vi.fn().mockResolvedValue(undefined);
		const loop = new PollLoop({ intervalMs: 1000, tick });
		loop.start();
		loop.start(); // second call — should be no-op
		await vi.advanceTimersByTimeAsync(2500);
		expect(tick).toHaveBeenCalledTimes(2);
		await loop.stop();
	});

	it("continues calling tick after a rejection (error boundary isolates failures)", async () => {
		let callCount = 0;
		const tick = vi.fn().mockImplementation(async () => {
			callCount++;
			if (callCount === 1) {
				throw new Error("first tick fails");
			}
		});
		const loop = new PollLoop({ intervalMs: 1000, tick });
		loop.start();
		await vi.advanceTimersByTimeAsync(3500);
		// First tick rejects; subsequent ticks must still fire
		expect(tick).toHaveBeenCalledTimes(3);
		await loop.stop();
	});

	it("skips a new tick if the previous tick is still in flight", async () => {
		let resolveFirst: (() => void) | null = null;
		const tick = vi.fn().mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					if (resolveFirst === null) {
						resolveFirst = resolve;
						return;
					}
					resolve();
				}),
		);
		const loop = new PollLoop({ intervalMs: 1000, tick });
		loop.start();
		// First tick fires at 1000ms but never resolves
		await vi.advanceTimersByTimeAsync(1000);
		expect(tick).toHaveBeenCalledTimes(1);
		// Advance past more intervals — tick is still inflight, new fires must be skipped
		await vi.advanceTimersByTimeAsync(3000);
		expect(tick).toHaveBeenCalledTimes(1);
		// Resolve the first tick — next interval should fire a new tick
		if (resolveFirst) (resolveFirst as () => void)();
		await vi.advanceTimersByTimeAsync(1000);
		expect(tick).toHaveBeenCalledTimes(2);
		await loop.stop();
	});
});
