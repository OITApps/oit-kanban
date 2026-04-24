import type { BoardColumn, BoardColumnId, BoardData } from "@/types";

const columnOrder: Array<{ id: BoardColumnId; title: string }> = [
	{ id: "backlog", title: "Backlog" },
	{ id: "design", title: "Design" },
	{ id: "in_progress", title: "Building" },
	{ id: "review", title: "Review" },
	{ id: "qa", title: "QA" },
	{ id: "shipped", title: "Shipped" },
	{ id: "trash", title: "Trash" },
];

function createEmptyColumn(id: BoardColumnId, title: string): BoardColumn {
	return {
		id,
		title,
		cards: [],
	};
}

export function createInitialBoardData(): BoardData {
	return {
		columns: columnOrder.map((column) => createEmptyColumn(column.id, column.title)),
		dependencies: [],
	};
}
