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
 * Pure-function helper: given captured stdout/stderr/exitCode, parse the
 * result without spawning a subprocess. Used by tests AND by invokeClaude
 * after it collects the subprocess output.
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

	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout.trim());
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
