import { describe, expect, it, vi } from "vitest";
import { type ReconcileAdapters, reconcile } from "../reconcile.js";
import type { DispatcherCard } from "../types.js";

function makeCard(overrides: Partial<DispatcherCard> = {}): DispatcherCard {
	return {
		cardId: "card-001",
		status: "active",
		lastSeenAt: Date.now(),
		currentAttemptId: null,
		blockerCount: 0,
		...overrides,
	};
}

describe("reconcile", () => {
	it("returns empty to-stop list when all origins are still open", async () => {
		const adapters: ReconcileAdapters = {
			refreshClickUpStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
			refreshGhStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
		};
		const cards = [makeCard({ cardId: "cu-1" }), makeCard({ cardId: "cu-2" })];
		const result = await reconcile(cards, adapters);
		expect(result.toStop).toHaveLength(0);
		expect(result.toBlock).toHaveLength(0);
	});

	it("adds cardId to toStop when origin is terminal (closed/done)", async () => {
		const adapters: ReconcileAdapters = {
			refreshClickUpStatus: vi.fn().mockResolvedValue({ terminal: true, missing: false }),
			refreshGhStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
		};
		const cards = [makeCard({ cardId: "cu-terminal" })];
		const result = await reconcile(cards, adapters);
		expect(result.toStop).toContain("cu-terminal");
	});

	it("adds cardId to toBlock when origin returns 404", async () => {
		const adapters: ReconcileAdapters = {
			refreshClickUpStatus: vi.fn().mockResolvedValue({ terminal: false, missing: true }),
			refreshGhStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
		};
		const cards = [makeCard({ cardId: "cu-missing" })];
		const result = await reconcile(cards, adapters);
		expect(result.toBlock).toContain("cu-missing");
	});

	it("calls refreshGhStatus for gh-issue cards", async () => {
		const refreshGhStatus = vi.fn().mockResolvedValue({ terminal: true, missing: false });
		const adapters: ReconcileAdapters = {
			refreshClickUpStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
			refreshGhStatus,
		};
		const cards = [makeCard({ cardId: "gh-issue://OITApps/ucdata/issues/999" })];
		const result = await reconcile(cards, adapters);
		expect(refreshGhStatus).toHaveBeenCalledWith("gh-issue://OITApps/ucdata/issues/999");
		expect(result.toStop).toContain("gh-issue://OITApps/ucdata/issues/999");
	});

	it("handles adapter errors by marking as blocked (not crashing)", async () => {
		const adapters: ReconcileAdapters = {
			refreshClickUpStatus: vi.fn().mockRejectedValue(new Error("network timeout")),
			refreshGhStatus: vi.fn().mockResolvedValue({ terminal: false, missing: false }),
		};
		const cards = [makeCard({ cardId: "error-card" })];
		const result = await reconcile(cards, adapters);
		expect(result.toBlock).toContain("error-card");
	});
});
