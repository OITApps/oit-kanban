import { spawn } from "node:child_process";
import type { ToolCall } from "../schema/oit-card-extensions.js";

export interface ClaudeResult {
	success: boolean;
	parsed: unknown;
	toolCalls: ToolCall[];
	error: string | null;
	stdout: string;
	stderr: string;
	exitCode: number;
}

export interface ClaudeInvocation {
	prompt: string;
	cwd: string;
	model?: string | null;
	timeoutMs?: number;
}

/**
 * Extract the plain-text result from a `claude -p --output-format json`
 * envelope. That format emits a JSON array of event objects; the last element
 * with `type === "result"` carries the actual assistant text in its `result`
 * field. If the input is already a plain object (e.g. in unit tests that pass
 * mocked parsed values directly), it is returned unchanged.
 */
function unwrapClaudeEnvelope(raw: unknown): { text: string } | { object: unknown } {
	if (!Array.isArray(raw)) {
		// Not an envelope — treat as already-unwrapped object.
		return { object: raw };
	}
	// Find the last element with type === "result".
	for (let i = raw.length - 1; i >= 0; i--) {
		const item = raw[i];
		if (item && typeof item === "object" && (item as { type?: unknown }).type === "result") {
			const text = (item as { result?: unknown }).result;
			if (typeof text === "string") {
				return { text };
			}
		}
	}
	// Fallback: no result element found — return the raw array so the caller
	// can surface a useful error.
	return { object: raw };
}

/**
 * Strip markdown code fences from a string that may look like:
 *   ```json\n{...}\n```
 * Returns the inner content, or the original string if no fences are present.
 */
function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = /^```(?:json|js|javascript)?\s*\n([\s\S]*?)\n```\s*$/.exec(trimmed);
	return fenceMatch ? (fenceMatch[1] ?? trimmed) : trimmed;
}

/**
 * Pure-function helper: given captured stdout/stderr/exitCode, parse the
 * result without spawning a subprocess. Used by tests AND by invokeClaude
 * after it collects the subprocess output.
 *
 * Handles `--output-format json` envelope: `claude -p --output-format json`
 * emits a JSON array of event objects. This function unwraps that envelope,
 * extracts the assistant's text, strips any markdown code fences, and parses
 * the inner JSON — so callers always receive the structured object the
 * template asked Claude to produce.
 */
export function invokeClaudeMocked(input: { stdout: string; stderr: string; exitCode: number }): ClaudeResult {
	const { stdout, stderr, exitCode } = input;

	if (exitCode !== 0) {
		return {
			success: false,
			parsed: null,
			toolCalls: [],
			error: `claude exited with exit code ${exitCode}: ${stderr.trim() || "no stderr"}`,
			stdout,
			stderr,
			exitCode,
		};
	}

	let outerParsed: unknown;
	try {
		outerParsed = JSON.parse(stdout.trim());
	} catch {
		return {
			success: false,
			parsed: null,
			toolCalls: [],
			error: `claude stdout was not valid JSON. First 200 chars: ${stdout.slice(0, 200)}`,
			stdout,
			stderr,
			exitCode,
		};
	}

	// Unwrap the --output-format json envelope if present.
	const unwrapped = unwrapClaudeEnvelope(outerParsed);

	let parsed: unknown;
	if ("text" in unwrapped) {
		// We got a text response from the envelope — parse the inner JSON.
		const innerText = stripMarkdownFences(unwrapped.text);
		try {
			parsed = JSON.parse(innerText);
		} catch {
			return {
				success: false,
				parsed: null,
				toolCalls: [],
				error: `claude response was not valid JSON. First 200 chars: ${innerText.slice(0, 200)}`,
				stdout,
				stderr,
				exitCode,
			};
		}
	} else {
		// Already an object (unit test mock path or future format).
		parsed = unwrapped.object;
	}

	const toolCalls: ToolCall[] = [];
	if (parsed && typeof parsed === "object" && Array.isArray((parsed as { tool_calls?: unknown }).tool_calls)) {
		for (const raw of (parsed as { tool_calls: unknown[] }).tool_calls) {
			if (raw && typeof raw === "object") {
				const tool = (raw as { tool?: unknown }).tool;
				const args = (raw as { args?: unknown }).args;
				if (typeof tool === "string" && args && typeof args === "object") {
					toolCalls.push({ tool, args: args as Record<string, unknown> });
				}
			}
		}
	}

	return {
		success: true,
		parsed,
		toolCalls,
		error: null,
		stdout,
		stderr,
		exitCode,
	};
}

/**
 * Actually spawn `claude -p` and collect its output. Thin wrapper around
 * invokeClaudeMocked. Used in production code paths.
 */
export async function invokeClaude(invocation: ClaudeInvocation): Promise<ClaudeResult> {
	const { prompt, cwd, model, timeoutMs = 120_000 } = invocation;

	return await new Promise<ClaudeResult>((resolve) => {
		const args = ["-p", "--output-format", "json"];
		if (model) {
			args.push("--model", model);
		}

		const child = spawn("claude", args, { cwd });
		let stdout = "";
		let stderr = "";
		let exited = false;

		const timer = setTimeout(() => {
			if (!exited) {
				child.kill("SIGKILL");
			}
		}, timeoutMs);

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", (err) => {
			exited = true;
			clearTimeout(timer);
			resolve({
				success: false,
				parsed: null,
				toolCalls: [],
				error: `spawn claude failed: ${err.message}`,
				stdout,
				stderr,
				exitCode: -1,
			});
		});

		child.on("close", (code) => {
			exited = true;
			clearTimeout(timer);
			resolve(invokeClaudeMocked({ stdout, stderr, exitCode: code ?? -1 }));
		});

		child.stdin.write(prompt);
		child.stdin.end();
	});
}
