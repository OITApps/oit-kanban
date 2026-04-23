import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";
import { runEmit } from "../emit/emit-service.js";
import type { OriginRef } from "../schema/oit-card-extensions.js";

export interface ClickUpImportInput {
	url: string;
	templateMarkdown: string;
	policyMarkdown: string;
	cwd: string;
	invoke: (invocation: ClaudeInvocation) => Promise<ClaudeResult>;
}

export interface ClickUpImportResult {
	success: boolean;
	origin: OriginRef | null;
	error: string | null;
}

export async function importFromClickUp(input: ClickUpImportInput): Promise<ClickUpImportResult> {
	const emit = await runEmit({
		event: "on-imported",
		templatePath: "import-clickup.md",
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
	};

	if (parsed?.error) {
		return { success: false, origin: null, error: `ClickUp: ${parsed.error}` };
	}

	if (!parsed?.id || !parsed?.title) {
		return { success: false, origin: null, error: "ClickUp response missing id or title" };
	}

	const origin: OriginRef = {
		tracker: "clickup",
		id: parsed.id,
		url: input.url,
		title_snapshot: parsed.title,
		description_snapshot: parsed.description ?? "",
		imported_at: Date.now(),
		last_refreshed_at: null,
	};

	return { success: true, origin, error: null };
}
