export type {
	AttemptRecord,
	DispatcherCard,
	DispatcherOptions,
	DispatcherState,
	RunSpec,
} from "./types.js";

export interface DispatcherHandle {
	start: () => void;
	stop: () => Promise<void>;
}

/**
 * Factory: wire together store + poll loop + concurrency gate.
 * Stub for now — full implementation added in later tasks.
 */
export function createDispatcher(opts: import("./types.js").DispatcherOptions): DispatcherHandle {
	void opts; // used in later tasks
	return {
		start() {
			// wired in Task 3
		},
		async stop() {
			// wired in Task 3
		},
	};
}
