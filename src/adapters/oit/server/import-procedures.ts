/**
 * OIT tRPC procedures: ClickUp, GitHub Issues, and GitHub PRs import.
 * Wired into runtimeAppRouter as `oit.import.clickup`, `oit.import.ghIssue`, `oit.import.ghPr`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { importFromClickUp } from "../adapters/clickup-adapter.js";
import { importFromGhIssue, importFromGhPr } from "../adapters/gh-adapter.js";
import { invokeClaude } from "../emit/claude-invoker.js";
import type { OriginRef } from "../schema/oit-card-extensions.js";

const t = initTRPC.create();

const importUrlInputSchema = z.object({
	url: z.string().min(1),
});

export type ImportClickUpInput = z.infer<typeof importUrlInputSchema>;

export interface ImportClickUpOutput {
	ok: true;
	origin: OriginRef;
}

export interface ImportClickUpError {
	ok: false;
	error: string;
}

export type ImportClickUpResult = ImportClickUpOutput | ImportClickUpError;

async function readHookFiles(
	hooksDir: string,
	templateFile: string,
): Promise<{ templateMarkdown: string; policyMarkdown: string } | { error: string }> {
	try {
		const [templateMarkdown, policyMarkdown] = await Promise.all([
			readFile(join(hooksDir, templateFile), "utf8"),
			readFile(join(hooksDir, "POLICY.md"), "utf8"),
		]);
		return { templateMarkdown, policyMarkdown };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return { error: `Failed to read OIT hook files: ${msg}` };
	}
}

/**
 * Build the OIT import sub-router.
 * Called once at startup — the router is stateless.
 */
export function createOitImportRouter() {
	return t.router({
		clickup: t.procedure.input(importUrlInputSchema).mutation(async ({ input }): Promise<ImportClickUpResult> => {
			const hooksDir = join(process.cwd(), "src", "adapters", "oit", "hooks");

			const files = await readHookFiles(hooksDir, "import-clickup.md");
			if ("error" in files) {
				return { ok: false, error: files.error };
			}

			const result = await importFromClickUp({
				url: input.url,
				templateMarkdown: files.templateMarkdown,
				policyMarkdown: files.policyMarkdown,
				cwd: process.cwd(),
				invoke: invokeClaude,
			});

			if (!result.success || !result.origin) {
				return { ok: false, error: result.error ?? "Unknown import error" };
			}

			return { ok: true, origin: result.origin };
		}),

		ghIssue: t.procedure.input(importUrlInputSchema).mutation(async ({ input }): Promise<ImportClickUpResult> => {
			const hooksDir = join(process.cwd(), "src", "adapters", "oit", "hooks");

			const files = await readHookFiles(hooksDir, "import-gh-issue.md");
			if ("error" in files) {
				return { ok: false, error: files.error };
			}

			const result = await importFromGhIssue({
				url: input.url,
				templateMarkdown: files.templateMarkdown,
				policyMarkdown: files.policyMarkdown,
				cwd: process.cwd(),
				invoke: invokeClaude,
			});

			if (!result.success || !result.origin) {
				return { ok: false, error: result.error ?? "Unknown import error" };
			}

			return { ok: true, origin: result.origin };
		}),

		ghPr: t.procedure.input(importUrlInputSchema).mutation(async ({ input }): Promise<ImportClickUpResult> => {
			const hooksDir = join(process.cwd(), "src", "adapters", "oit", "hooks");

			const files = await readHookFiles(hooksDir, "import-gh-pr.md");
			if ("error" in files) {
				return { ok: false, error: files.error };
			}

			const result = await importFromGhPr({
				url: input.url,
				templateMarkdown: files.templateMarkdown,
				policyMarkdown: files.policyMarkdown,
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
