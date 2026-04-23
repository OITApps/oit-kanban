/**
 * Lightweight in-memory store for per-card last-emit outcome.
 * NOT persisted — cleared on page reload. That's acceptable for Stage 0.
 *
 * Uses a module-level Map + a set of registered listeners (React setState
 * callbacks) so components can subscribe without pulling in Zustand or Context.
 */

export interface OitEmitState {
	failed: boolean;
	error: string | null;
}

const state = new Map<string, OitEmitState>();
// Set of (cardId, listener) pairs so per-card components only re-render for
// their own card, not every card.
const listeners = new Map<string, Set<() => void>>();

export function getEmitState(cardId: string): OitEmitState {
	return state.get(cardId) ?? { failed: false, error: null };
}

export function setEmitFailed(cardId: string, error: string): void {
	state.set(cardId, { failed: true, error });
	notify(cardId);
}

export function clearEmitFailed(cardId: string): void {
	state.delete(cardId);
	notify(cardId);
}

function notify(cardId: string): void {
	const cbs = listeners.get(cardId);
	if (cbs) {
		for (const cb of cbs) {
			cb();
		}
	}
}

export function subscribeEmitState(cardId: string, callback: () => void): () => void {
	if (!listeners.has(cardId)) {
		listeners.set(cardId, new Set());
	}
	listeners.get(cardId)!.add(callback);
	return () => {
		listeners.get(cardId)!.delete(callback);
	};
}
