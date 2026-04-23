/**
 * OIT tRPC procedures: emit (manual-update + settings).
 * Wired into runtimeAppRouter as `oit.emit.*`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { invokeClaude } from "../emit/claude-invoker.js";
import { runEmit } from "../emit/emit-service.js";
import { getEmitDisabled, setEmitDisabled } from "./emit-settings-store.js";

const t = initTRPC.create();

const manualUpdateInputSchema = z.object({
	/** The card ID. */
	cardId: z.string().min(1),
	/** Card title (trusted — comes from the kanban data model). */
	cardTitle: z.string(),
	/** Card description (untrusted — may contain user-supplied text). */
	cardDescription: z.string(),
	/** Lane/column the card is currently in. */
	cardLane: z.string(),
	/**
	 * Serialized origins array (untrusted — these are URLs pulled from external
	 * trackers that may contain malicious content).
	 */
	origins: z.string(),
	/**
	 * Number of origins (trusted — computed by the caller from the origins array
	 * length before passing the untrusted JSON string).
	 */
	originCount: z.number().int().nonnegative(),
	/**
	 * Kanban-internal URL for the card (trusted).
	 */
	kanbanCardUrl: z.string(),
});

export type ManualUpdateInput = z.infer<typeof manualUpdateInputSchema>;

export interface ManualUpdateOutput {
	success: boolean;
	error: string | null;
	tool_calls: Array<{ tool: string; args: Record<string, unknown> }>;
}

const getSettingsInputSchema = z.object({
	cardId: z.string().min(1),
});

const setSettingsInputSchema = z.object({
	cardId: z.string().min(1),
	disabled: z.boolean(),
});

export interface EmitSettingsOutput {
	cardId: string;
	disabled: boolean;
}

/**
 * Build the OIT emit sub-router.
 * Called once at startup — the router is stateless (settings stored on disk).
 */
export function createOitEmitRouter() {
	return t.router({
		manualUpdate: t.procedure
			.input(manualUpdateInputSchema)
			.mutation(async ({ input }): Promise<ManualUpdateOutput> => {
				const hooksDir = join(process.cwd(), "src", "adapters", "oit", "hooks");

				let templateMarkdown: string;
				let policyMarkdown: string;
				try {
					[templateMarkdown, policyMarkdown] = await Promise.all([
						readFile(join(hooksDir, "manual-update.md"), "utf8"),
						readFile(join(hooksDir, "POLICY.md"), "utf8"),
					]);
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err);
					return { success: false, error: `Failed to read OIT hook files: ${msg}`, tool_calls: [] };
				}

				// Check if emits are disabled for this card
				const disabled = await getEmitDisabled(input.cardId);
				if (disabled) {
					return {
						success: false,
						error: "Emits are disabled for this card.",
						tool_calls: [],
					};
				}

				const result = await runEmit({
					event: "on-manual-update",
					templatePath: "manual-update.md",
					templateMarkdown,
					policyMarkdown,
					trustedVars: {
						card_title: input.cardTitle,
						card_id: input.cardId,
						card_lane: input.cardLane,
						kanban_card_url: input.kanbanCardUrl,
						origin_count: input.originCount,
					},
					untrustedVars: {
						card_description: input.cardDescription,
						origins: input.origins,
					},
					cwd: process.cwd(),
					invoke: invokeClaude,
				});

				return {
					success: result.success,
					error: result.error,
					tool_calls: result.toolCalls,
				};
			}),

		getSettings: t.procedure.input(getSettingsInputSchema).query(async ({ input }): Promise<EmitSettingsOutput> => {
			const disabled = await getEmitDisabled(input.cardId);
			return { cardId: input.cardId, disabled };
		}),

		setSettings: t.procedure
			.input(setSettingsInputSchema)
			.mutation(async ({ input }): Promise<EmitSettingsOutput> => {
				await setEmitDisabled(input.cardId, input.disabled);
				return { cardId: input.cardId, disabled: input.disabled };
			}),
	});
}

export type OitEmitRouter = ReturnType<typeof createOitEmitRouter>;
