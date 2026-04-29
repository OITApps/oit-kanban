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
});
