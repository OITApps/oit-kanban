import { useEffect, useState } from "react";
import { getRuntimeTrpcClient } from "@/runtime/trpc-client";

export interface EmitSettingsPanelProps {
	cardId: string;
	workspaceId: string | null;
}

export function EmitSettingsPanel({ cardId, workspaceId }: EmitSettingsPanelProps) {
	const [emitDisabled, setEmitDisabled] = useState(false);
	const [loading, setLoading] = useState(true);

	// Load persisted setting on mount / card change
	useEffect(() => {
		setLoading(true);
		const trpcClient = getRuntimeTrpcClient(workspaceId);
		trpcClient.oit.emit.getSettings.query({ cardId }).then((result) => {
			setEmitDisabled(result.disabled);
			setLoading(false);
		});
	}, [cardId, workspaceId]);

	async function handleChange(checked: boolean) {
		setEmitDisabled(checked);
		const trpcClient = getRuntimeTrpcClient(workspaceId);
		await trpcClient.oit.emit.setSettings.mutate({ cardId, disabled: checked });
	}

	return (
		<div
			style={{
				padding: "8px 12px",
				borderTop: "1px solid var(--color-border, #eee)",
				fontSize: 12,
				color: "var(--color-text-secondary, #555)",
			}}
		>
			<label style={{ display: "flex", alignItems: "center", gap: 8, cursor: loading ? "wait" : "pointer" }}>
				<input
					type="checkbox"
					checked={emitDisabled}
					disabled={loading}
					onChange={(e) => {
						void handleChange(e.target.checked);
					}}
				/>
				Disable origin emits for this card
			</label>
		</div>
	);
}
