import type { EmitAttempt, LifecycleEvent } from "../schema/oit-card-extensions.js";
import type { ClaudeInvocation, ClaudeResult } from "./claude-invoker.js";
import { renderTemplate } from "./template-renderer.js";

export interface EmitInput {
	event: LifecycleEvent;
	templatePath: string;
	templateMarkdown: string;
	policyMarkdown: string;
	trustedVars: Record<string, string | number>;
	untrustedVars: Record<string, string>;
	cwd: string;
	invoke: (invocation: ClaudeInvocation) => Promise<ClaudeResult>;
}

export interface EmitResult extends Omit<EmitAttempt, "at"> {
	at: number;
	parsed: unknown;
	/** Camelcase alias for tool_calls — used by callers and tests. */
	toolCalls: EmitAttempt["tool_calls"];
}

export async function runEmit(input: EmitInput): Promise<EmitResult> {
	const { rendered, model } = renderTemplate({
		policyMarkdown: input.policyMarkdown,
		templateMarkdown: input.templateMarkdown,
		trustedVars: input.trustedVars,
		untrustedVars: input.untrustedVars,
	});

	const tryOnce = async (): Promise<ClaudeResult> => {
		return await input.invoke({
			prompt: rendered,
			cwd: input.cwd,
			model: model,
			timeoutMs: 120_000,
		});
	};

	let last = await tryOnce();
	if (!last.success) {
		last = await tryOnce(); // 1-shot retry
	}

	return {
		event: input.event,
		template: input.templatePath,
		tool_calls: last.toolCalls,
		toolCalls: last.toolCalls,
		success: last.success,
		error: last.error,
		at: Date.now(),
		parsed: last.parsed,
	};
}
