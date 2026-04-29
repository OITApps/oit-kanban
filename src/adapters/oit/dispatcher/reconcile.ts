import type { DispatcherCard } from "./types.js";

export interface OriginStatus {
	terminal: boolean; // closed / done / merged — run should stop
	missing: boolean; // 404 — mark blocked
}

export interface ReconcileAdapters {
	/** Call the existing clickup-adapter's status check. */
	refreshClickUpStatus: (cardId: string) => Promise<OriginStatus>;
	/** Call the existing gh-adapter's status check for issues and PRs. */
	refreshGhStatus: (cardId: string) => Promise<OriginStatus>;
}

export interface ReconcileResult {
	toStop: string[]; // card IDs whose origins are terminal
	toBlock: string[]; // card IDs whose origins are missing or errored
}

/**
 * Refresh status for each card from its origin tracker.
 * Routes to ClickUp or GitHub adapter based on cardId prefix convention.
 * Does NOT rewrite adapter code — delegates to the injected adapter fns.
 */
export async function reconcile(cards: DispatcherCard[], adapters: ReconcileAdapters): Promise<ReconcileResult> {
	const toStop: string[] = [];
	const toBlock: string[] = [];

	await Promise.all(
		cards.map(async (card) => {
			try {
				const isGh = card.cardId.startsWith("gh-issue://") || card.cardId.startsWith("gh-pr://");

				const status = isGh
					? await adapters.refreshGhStatus(card.cardId)
					: await adapters.refreshClickUpStatus(card.cardId);

				if (status.terminal) {
					toStop.push(card.cardId);
				} else if (status.missing) {
					toBlock.push(card.cardId);
				}
			} catch (err) {
				// biome-ignore lint: console allowed for error boundary logging
				console.error(`[reconcile] error refreshing ${card.cardId}:`, err);
				toBlock.push(card.cardId);
			}
		}),
	);

	return { toStop, toBlock };
}
