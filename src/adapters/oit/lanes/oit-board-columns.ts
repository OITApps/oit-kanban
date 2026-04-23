import { runtimeBoardColumnIdSchema } from "../../../core/api-contract.js";

export const OIT_BOARD_COLUMNS = {
	BACKLOG: "backlog",
	DESIGN: "design",
	BUILDING: "in_progress", // Display name "Building", underlying key "in_progress"
	REVIEW: "review",
	QA: "qa",
	SHIPPED: "shipped",
	TRASH: "trash",
} as const;

export const OIT_BOARD_COLUMN_LABELS = {
	backlog: "Backlog",
	design: "Design",
	in_progress: "Building",
	review: "Review",
	qa: "QA",
	shipped: "Shipped",
	trash: "Trash",
} as const;

export const oitBoardColumnOrder = [
	OIT_BOARD_COLUMNS.BACKLOG,
	OIT_BOARD_COLUMNS.DESIGN,
	OIT_BOARD_COLUMNS.BUILDING,
	OIT_BOARD_COLUMNS.REVIEW,
	OIT_BOARD_COLUMNS.QA,
	OIT_BOARD_COLUMNS.SHIPPED,
] as const;

// Re-export the runtime schema
export { runtimeBoardColumnIdSchema as oitBoardColumnIdSchema };
