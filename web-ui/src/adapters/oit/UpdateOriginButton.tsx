import { useState } from "react";
import { getRuntimeTrpcClient } from "@/runtime/trpc-client";
import { clearEmitFailed, setEmitFailed } from "./emit-state.js";

export interface UpdateOriginButtonProps {
	cardId: string;
	cardTitle: string;
	cardDescription: string;
	cardLane: string;
	origins: string;
	originCount: number;
	kanbanCardUrl: string;
	/** Set to true when emits are disabled for this card. */
	emitDisabled?: boolean;
	/** Called after every attempt (success or failure). */
	onResult?: (result: { success: boolean; error: string | null }) => void;
	/** workspaceId needed to resolve the tRPC client */
	workspaceId: string | null;
}

export function UpdateOriginButton({
	cardId,
	cardTitle,
	cardDescription,
	cardLane,
	origins,
	originCount,
	kanbanCardUrl,
	emitDisabled,
	onResult,
	workspaceId,
}: UpdateOriginButtonProps) {
	const [busy, setBusy] = useState(false);

	async function handleClick() {
		setBusy(true);
		try {
			const trpcClient = getRuntimeTrpcClient(workspaceId);
			const payload = await trpcClient.oit.emit.manualUpdate.mutate({
				cardId,
				cardTitle,
				cardDescription,
				cardLane,
				origins,
				originCount,
				kanbanCardUrl,
			});

			if (payload.success) {
				clearEmitFailed(cardId);
			} else {
				setEmitFailed(cardId, payload.error ?? "Unknown emit error");
			}

			onResult?.({ success: payload.success, error: payload.error });
		} catch (err) {
			const msg = (err as Error).message ?? "Unexpected error";
			setEmitFailed(cardId, msg);
			onResult?.({ success: false, error: msg });
		} finally {
			setBusy(false);
		}
	}

	return (
		<button
			type="button"
			disabled={emitDisabled || busy}
			onClick={handleClick}
			title={emitDisabled ? "Emits are disabled for this card" : "Update origin tracker(s) with current card state"}
			style={{
				fontSize: 11,
				padding: "2px 6px",
				borderRadius: 4,
				cursor: emitDisabled || busy ? "not-allowed" : "pointer",
				opacity: emitDisabled || busy ? 0.5 : 1,
			}}
		>
			{busy ? "Updating…" : "Update origin"}
		</button>
	);
}
