export interface StallDetectorOptions {
	stallTimeoutMs?: number;
}

type WatchResult = "ok" | "stalled";

/**
 * Per-run watchdog: resolves "stalled" if no activity is notified within
 * stallTimeoutMs. Resolves "ok" if the AbortSignal fires first.
 *
 * The timeout is SLIDING — each notifyActivity() call resets the deadline.
 * This allows long-running but active Claude invocations to not be killed.
 */
export class StallDetector {
	private readonly stallTimeoutMs: number;
	/** attemptId → timer handle for active watches. */
	private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
	/** attemptId → resolve function for the watch promise. */
	private readonly resolvers = new Map<string, (result: WatchResult) => void>();

	constructor(opts: StallDetectorOptions = {}) {
		this.stallTimeoutMs = opts.stallTimeoutMs ?? 120_000;
	}

	/**
	 * Begin watching an attempt. Returns a Promise that resolves to:
	 * - "ok" — the AbortSignal fired (run completed normally)
	 * - "stalled" — stallTimeoutMs elapsed with no notifyActivity() call
	 */
	watch(attemptId: string, signal: AbortSignal): Promise<WatchResult> {
		return new Promise<WatchResult>((resolve) => {
			// If already aborted before we even start, resolve immediately.
			if (signal.aborted) {
				resolve("ok");
				return;
			}

			this.resolvers.set(attemptId, resolve);

			const arm = (): void => {
				const existing = this.timers.get(attemptId);
				if (existing !== undefined) clearTimeout(existing);
				const handle = setTimeout(() => {
					this.cleanup(attemptId);
					resolve("stalled");
				}, this.stallTimeoutMs);
				this.timers.set(attemptId, handle);
			};

			arm();

			signal.addEventListener(
				"abort",
				() => {
					this.cleanup(attemptId);
					resolve("ok");
				},
				{ once: true },
			);
		});
	}

	/**
	 * Notify that the run is still alive — resets the stall deadline.
	 * No-op if attemptId is not currently being watched.
	 */
	notifyActivity(attemptId: string): void {
		if (!this.resolvers.has(attemptId)) return;
		const existing = this.timers.get(attemptId);
		if (existing !== undefined) clearTimeout(existing);
		const handle = setTimeout(() => {
			// Capture resolver BEFORE cleanup, otherwise the resolvers Map entry
			// is deleted and we'd never resolve the watch Promise.
			const resolver = this.resolvers.get(attemptId);
			this.cleanup(attemptId);
			if (resolver) resolver("stalled");
		}, this.stallTimeoutMs);
		this.timers.set(attemptId, handle);
	}

	private cleanup(attemptId: string): void {
		const handle = this.timers.get(attemptId);
		if (handle !== undefined) clearTimeout(handle);
		this.timers.delete(attemptId);
		this.resolvers.delete(attemptId);
	}
}
