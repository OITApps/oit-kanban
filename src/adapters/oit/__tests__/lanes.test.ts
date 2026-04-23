import { describe, expect, it } from "vitest";
import { OIT_BOARD_COLUMN_LABELS, OIT_BOARD_COLUMNS, oitBoardColumnOrder } from "../lanes/oit-board-columns.js";

describe("OIT 6-lane board columns (additive seam)", () => {
	it("exposes the 6 OIT lanes in order via oitBoardColumnOrder", () => {
		expect(oitBoardColumnOrder).toEqual(["backlog", "design", "in_progress", "review", "qa", "shipped"]);
	});

	it("maps Building to the upstream in_progress enum key", () => {
		expect(OIT_BOARD_COLUMNS.BUILDING).toBe("in_progress");
		expect(OIT_BOARD_COLUMN_LABELS.in_progress).toBe("Building");
	});

	it("exposes DESIGN, QA, SHIPPED as new OIT values", () => {
		expect(OIT_BOARD_COLUMNS.DESIGN).toBe("design");
		expect(OIT_BOARD_COLUMNS.QA).toBe("qa");
		expect(OIT_BOARD_COLUMNS.SHIPPED).toBe("shipped");
	});
});
