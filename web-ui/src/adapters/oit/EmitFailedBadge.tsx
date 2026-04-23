import { useEffect, useState } from "react";
import { clearEmitFailed, getEmitState, subscribeEmitState } from "./emit-state.js";

export interface EmitFailedBadgeProps {
	cardId: string;
	/** Called when user clicks Retry. Caller is responsible for re-invoking the emit. */
	onRetry: () => void;
}

export function EmitFailedBadge({ cardId, onRetry }: EmitFailedBadgeProps) {
	// Sync from module-level store so this component re-renders when state changes.
	const [emitState, setEmitState] = useState(() => getEmitState(cardId));
	const [open, setOpen] = useState(false);

	useEffect(() => {
		// Re-read on card change
		setEmitState(getEmitState(cardId));
		setOpen(false);
		return subscribeEmitState(cardId, () => {
			setEmitState(getEmitState(cardId));
		});
	}, [cardId]);

	if (!emitState.failed) {
		return null;
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{
					color: "white",
					background: "#c0392b",
					borderRadius: 4,
					padding: "2px 6px",
					fontSize: 11,
					cursor: "pointer",
					border: "none",
					marginLeft: 4,
				}}
				title="Click for details"
			>
				Emit failed
			</button>
			{open && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Emit failure details"
					style={{
						position: "fixed",
						top: "25%",
						left: "50%",
						transform: "translateX(-50%)",
						minWidth: 340,
						maxWidth: 640,
						padding: 20,
						background: "var(--color-surface-2, #fff)",
						border: "1px solid var(--color-border-bright, #ccc)",
						borderRadius: 8,
						zIndex: 1000,
						boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
					}}
				>
					<h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>Emit failed</h3>
					<pre
						style={{
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							fontSize: 12,
							background: "var(--color-surface-1, #f5f5f5)",
							padding: 8,
							borderRadius: 4,
							maxHeight: 200,
							overflowY: "auto",
						}}
					>
						{emitState.error ?? "Unknown error"}
					</pre>
					{/* TODO(Task 20): Add "Edit template" button once template editing UI is built */}
					<div style={{ display: "flex", gap: 8, marginTop: 12 }}>
						<button
							type="button"
							onClick={() => {
								setOpen(false);
								onRetry();
							}}
							style={{ padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
						>
							Retry
						</button>
						<button
							type="button"
							onClick={() => {
								clearEmitFailed(cardId);
								setOpen(false);
							}}
							style={{ padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
						>
							Mark resolved
						</button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							style={{ padding: "4px 12px", borderRadius: 4, cursor: "pointer" }}
						>
							Close
						</button>
					</div>
				</div>
			)}
		</>
	);
}
