import type { BoardColumn, BoardColumnId } from "@/types";

export interface ProgrammaticCardMoveInFlight {
	taskId: string;
	fromColumnId: BoardColumnId;
	toColumnId: BoardColumnId;
	insertAtTop: boolean;
}

function isMatchingProgrammaticCardMove(
	taskId: string | null | undefined,
	fromColumnId: BoardColumnId,
	toColumnId: BoardColumnId,
	programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null,
): boolean {
	return (
		taskId !== null &&
		taskId !== undefined &&
		programmaticCardMoveInFlight?.taskId === taskId &&
		programmaticCardMoveInFlight.fromColumnId === fromColumnId &&
		programmaticCardMoveInFlight.toColumnId === toColumnId
	);
}

// OIT 6-lane workflow: backlog → design → in_progress (Building) → review → qa → shipped
// Manual drag is allowed for all forward moves; backward moves (e.g. review → in_progress)
// are programmatic-only (agent-driven). Trash accepts cards from any non-trash lane.
export function isAllowedCrossColumnCardMove(
	fromColumnId: BoardColumnId,
	toColumnId: BoardColumnId,
	options?: {
		taskId?: string | null;
		programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null;
	},
): boolean {
	// Forward moves: any adjacent or skipped forward step in the OIT pipeline
	const forwardMoves: Array<[BoardColumnId, BoardColumnId]> = [
		["backlog", "design"],
		["backlog", "in_progress"],
		["design", "in_progress"],
		["qa", "shipped"],
		["review", "qa"],
	];
	for (const [from, to] of forwardMoves) {
		if (fromColumnId === from && toColumnId === to) {
			return true;
		}
	}
	// Trash accepts anything from non-trash
	if (toColumnId === "trash" && fromColumnId !== "trash") {
		return true;
	}
	// Restore from trash to review
	if (fromColumnId === "trash" && toColumnId === "review") {
		return true;
	}
	// Programmatic-only: in_progress ↔ review (agent auto-transitions)
	if (
		(fromColumnId === "in_progress" && toColumnId === "review") ||
		(fromColumnId === "review" && toColumnId === "in_progress")
	) {
		return isMatchingProgrammaticCardMove(
			options?.taskId,
			fromColumnId,
			toColumnId,
			options?.programmaticCardMoveInFlight,
		);
	}
	return false;
}

export function findCardColumnId(columns: ReadonlyArray<BoardColumn>, taskId: string): BoardColumnId | null {
	for (const column of columns) {
		if (column.cards.some((card) => card.id === taskId)) {
			return column.id;
		}
	}
	return null;
}

export function isCardDropDisabled(
	columnId: BoardColumnId,
	activeDragSourceColumnId: BoardColumnId | null,
	options?: {
		activeDragTaskId?: string | null;
		programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null;
	},
): boolean {
	if (!activeDragSourceColumnId) {
		return false;
	}
	// Backlog and Design only accept reordering within themselves
	if (columnId === "backlog") {
		return activeDragSourceColumnId !== "backlog";
	}
	if (columnId === "design") {
		return (
			activeDragSourceColumnId !== "design" &&
			!isAllowedCrossColumnCardMove(activeDragSourceColumnId, columnId, options)
		);
	}
	// All other non-trash columns: allow if isAllowedCrossColumnCardMove says yes
	if (columnId === "in_progress" || columnId === "review" || columnId === "qa" || columnId === "shipped") {
		if (activeDragSourceColumnId === columnId) {
			return false; // reorder within column always allowed
		}
		return !isAllowedCrossColumnCardMove(activeDragSourceColumnId, columnId, {
			taskId: options?.activeDragTaskId,
			programmaticCardMoveInFlight: options?.programmaticCardMoveInFlight,
		});
	}
	if (columnId === "trash") {
		return activeDragSourceColumnId === "trash";
	}
	return false;
}
