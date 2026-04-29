/** Mirrors Symphony §4.1.8 issue row. */
export interface DispatcherCard {
	cardId: string;
	status: "active" | "paused" | "done" | "blocked";
	lastSeenAt: number; // Unix ms
	currentAttemptId: string | null;
	blockerCount: number;
}

/** Mirrors Symphony §4.1.8 attempt row. */
export interface AttemptRecord {
	id: string;
	cardId: string;
	attemptNumber: number;
	runnerKind: string;
	startedAt: number; // Unix ms
	endedAt: number | null;
	result: "success" | "fail" | "stalled" | "cancelled" | null;
	idempotencyKey: string;
	inputTokens: number;
	outputTokens: number;
}

/** Specification for a single dispatcher run. */
export interface RunSpec {
	cardId: string;
	attemptNumber: number;
	runnerKind: string;
	idempotencyKey: string;
}

/** Top-level dispatcher runtime state. */
export interface DispatcherState {
	paused: boolean;
	maxConcurrent: number;
}

/** Options passed to createDispatcher(). */
export interface DispatcherOptions {
	dbPath: string; // ":memory:" for tests, absolute path in production
	maxConcurrent?: number;
	pollIntervalMs?: number;
	stallTimeoutMs?: number;
}
