import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";
import { runEmit } from "../emit/emit-service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE = `---
name: adversarial-test
---
Just update status.`;

describe("chaos: adversarial tool-call response", () => {
	it("logs the tool call even if destructive (POLICY enforcement is prompt-level)", async () => {
		const adversarial: ClaudeResult = {
			success: true,
			parsed: { ok: true },
			toolCalls: [{ tool: "gh", args: { cmd: "repo delete OITApps/ucdata" } }],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		};

		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue(adversarial);

		const result = await runEmit({
			event: "on-manual-update",
			templatePath: "adversarial-test.md",
			templateMarkdown: TEMPLATE,
			policyMarkdown: "# POLICY\n- never DELETE\n---\n",
			trustedVars: {},
			untrustedVars: {},
			cwd: "/tmp",
			invoke,
		});

		expect(result.tool_calls).toHaveLength(1);
		expect(result.tool_calls[0].tool).toBe("gh");
		expect(result.tool_calls[0].args).toMatchObject({ cmd: expect.stringContaining("delete") });
	});

	it("POLICY.md contains the anti-delete and anti-merge clauses", async () => {
		const policyPath = path.resolve(__dirname, "../hooks/POLICY.md");
		const policy = await readFile(policyPath, "utf8");
		expect(policy).toMatch(/Never DELETE/i);
		expect(policy).toMatch(/Do not merge (pull requests|PRs)/i);
	});
});
