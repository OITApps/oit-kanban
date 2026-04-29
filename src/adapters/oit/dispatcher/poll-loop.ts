export interface PollLoopOptions {
	intervalMs?: number;
	tick: () => Promise<void>;
}

export class PollLoop {
	private readonly intervalMs: number;
	private readonly tick: () => Promise<void>;
	private handle: ReturnType<typeof setInterval> | null = null;
	private inflight: Promise<void> | null = null;

	constructor(opts: PollLoopOptions) {
		this.intervalMs = opts.intervalMs ?? 5_000;
		this.tick = opts.tick;
	}

	start(): void {
		if (this.handle !== null) return; // idempotent
		this.handle = setInterval(() => {
			this.inflight = this.tick().catch((err) => {
				// biome-ignore lint: console allowed for error boundary logging
				console.error("[PollLoop] tick error:", err);
			});
		}, this.intervalMs);
	}

	async stop(): Promise<void> {
		if (this.handle !== null) {
			clearInterval(this.handle);
			this.handle = null;
		}
		if (this.inflight !== null) {
			await this.inflight;
			this.inflight = null;
		}
	}
}
