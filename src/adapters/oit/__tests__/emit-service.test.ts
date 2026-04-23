import { describe, expect, it, vi } from "vitest";
import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";
import { runEmit } from "../emit/emit-service.js";

const FAKE_POLICY = "# POLICY\n- READ only.\n---\n";
const FAKE_TEMPLATE = `---
name: manual-update
model: claude-sonnet-4-6
---
Update origin for card {{card_id}}.`;

function succeedWith(value: unknown): ClaudeResult {
	return {
		success: true,
		parsed: value,
		toolCalls: [{ tool: "gh", args: { cmd: "issue comment" } }],
		error: null,
		stdout: JSON.stringify(value),
		stderr: "",
		exitCode: 0,
	};
}

function failWith(err: string): ClaudeResult {
	return {
		success: false,
		parsed: null,
		toolCalls: [],
		error: err,
		stdout: "",
		stderr: err,
		exitCode: 1,
	};
}

describe("runEmit", () => {
	it("runs once and logs success with tool calls", async () => {
		const invoke = vi.fn().mockResolvedValue(succeedWith({ ok: true }));
		const result = await runEmit({
			event: "on-manual-update",
			templatePath: "manual-update.md",
			templateMarkdown: FAKE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			trustedVars: { card_id: "card-123" },
			untrustedVars: {},
			cwd: "/tmp",
			invoke,
		});
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(true);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.error).toBeNull();
	});

	it("retries once on failure, then gives up", async () => {
		const invoke = vi
			.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>()
			.mockResolvedValueOnce(failWith("network error"))
			.mockResolvedValueOnce(failWith("network error again"));
		const result = await runEmit({
			event: "on-manual-update",
			templatePath: "manual-update.md",
			templateMarkdown: FAKE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			trustedVars: { card_id: "card-123" },
			untrustedVars: {},
			cwd: "/tmp",
			invoke,
		});
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(result.success).toBe(false);
		expect(result.error).toContain("network error again");
	});

	it("retries and succeeds on the second attempt", async () => {
		const invoke = vi
			.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>()
			.mockResolvedValueOnce(failWith("transient"))
			.mockResolvedValueOnce(succeedWith({ ok: true }));
		const result = await runEmit({
			event: "on-manual-update",
			templatePath: "manual-update.md",
			templateMarkdown: FAKE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			trustedVars: { card_id: "card-123" },
			untrustedVars: {},
			cwd: "/tmp",
			invoke,
		});
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(result.success).toBe(true);
	});
});
