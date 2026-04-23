/**
 * OIT tRPC procedures: ClickUp import.
 * Wired into runtimeAppRouter as `oit.import.clickup`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { importFromClickUp } from "../adapters/clickup-adapter.js";
import { invokeClaude } from "../emit/claude-invoker.js";
import type { OriginRef } from "../schema/oit-card-extensions.js";

const t = initTRPC.create();

const importClickUpInputSchema = z.object({
	url: z.string().min(1),
});

export type ImportClickUpInput = z.infer<typeof importClickUpInputSchema>;

export interface ImportClickUpOutput {
	ok: true;
	origin: OriginRef;
}

export interface ImportClickUpError {
	ok: false;
	error: string;
}

export type ImportClickUpResult = ImportClickUpOutput | ImportClickUpError;

/**
 * Build the OIT import sub-router.
 * Called once at startup — the router is stateless.
 */
export function createOitImportRouter() {
	return t.router({
		clickup: t.procedure.input(importClickUpInputSchema).mutation(async ({ input }): Promise<ImportClickUpResult> => {
			const hooksDir = join(process.cwd(), "src", "adapters", "oit", "hooks");

			let templateMarkdown: string;
			let policyMarkdown: string;
			try {
				[templateMarkdown, policyMarkdown] = await Promise.all([
					readFile(join(hooksDir, "import-clickup.md"), "utf8"),
					readFile(join(hooksDir, "POLICY.md"), "utf8"),
				]);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return { ok: false, error: `Failed to read OIT hook files: ${msg}` };
			}

			const result = await importFromClickUp({
				url: input.url,
				templateMarkdown,
				policyMarkdown,
				cwd: process.cwd(),
				invoke: invokeClaude,
			});

			if (!result.success || !result.origin) {
				return { ok: false, error: result.error ?? "Unknown import error" };
			}

			return { ok: true, origin: result.origin };
		}),
	});
}

export type OitImportRouter = ReturnType<typeof createOitImportRouter>;
