import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";
import { runEmit } from "../emit/emit-service.js";
import type { OriginRef } from "../schema/oit-card-extensions.js";

export interface GhImportInput {
	url: string;
	templateMarkdown: string;
	policyMarkdown: string;
	cwd: string;
	invoke: (invocation: ClaudeInvocation) => Promise<ClaudeResult>;
}

export interface GhImportResult {
	success: boolean;
	origin: OriginRef | null;
	error: string | null;
}

export async function importFromGhIssue(input: GhImportInput): Promise<GhImportResult> {
	const emit = await runEmit({
		event: "on-imported",
		templatePath: "import-gh-issue.md",
		templateMarkdown: input.templateMarkdown,
		policyMarkdown: input.policyMarkdown,
		trustedVars: { url: input.url },
		untrustedVars: {},
		cwd: input.cwd,
		invoke: input.invoke,
	});

	if (!emit.success) {
		return { success: false, origin: null, error: emit.error };
	}

	const parsed = emit.parsed as {
		error?: string;
		id?: string;
		title?: string;
		description?: string;
		status?: string;
		assignees?: string[];
	};

	if (parsed?.error) {
		return { success: false, origin: null, error: `GitHub Issue: ${parsed.error}` };
	}

	if (!parsed?.id || !parsed?.title) {
		return { success: false, origin: null, error: "GitHub Issue response missing id or title" };
	}

	const origin: OriginRef = {
		tracker: "gh-issue",
		id: parsed.id,
		url: input.url,
		title_snapshot: parsed.title,
		description_snapshot: parsed.description ?? "",
		imported_at: Date.now(),
		last_refreshed_at: null,
	};

	return { success: true, origin, error: null };
}

export async function importFromGhPr(input: GhImportInput): Promise<GhImportResult> {
	const emit = await runEmit({
		event: "on-imported",
		templatePath: "import-gh-pr.md",
		templateMarkdown: input.templateMarkdown,
		policyMarkdown: input.policyMarkdown,
		trustedVars: { url: input.url },
		untrustedVars: {},
		cwd: input.cwd,
		invoke: input.invoke,
	});

	if (!emit.success) {
		return { success: false, origin: null, error: emit.error };
	}

	const parsed = emit.parsed as {
		error?: string;
		id?: string;
		title?: string;
		description?: string;
		status?: string;
		head_ref?: string;
		base_ref?: string;
		assignees?: string[];
	};

	if (parsed?.error) {
		return { success: false, origin: null, error: `GitHub PR: ${parsed.error}` };
	}

	if (!parsed?.id || !parsed?.title) {
		return { success: false, origin: null, error: "GitHub PR response missing id or title" };
	}

	// Pack branch info into description_snapshot to avoid adding new OriginRef fields.
	const branchSuffix =
		parsed.head_ref || parsed.base_ref
			? `\n\n[PR: head=${parsed.head_ref ?? "?"}, base=${parsed.base_ref ?? "?"}]`
			: "";

	const origin: OriginRef = {
		tracker: "gh-pr",
		id: parsed.id,
		url: input.url,
		title_snapshot: parsed.title,
		description_snapshot: (parsed.description ?? "") + branchSuffix,
		imported_at: Date.now(),
		last_refreshed_at: null,
	};

	return { success: true, origin, error: null };
}
