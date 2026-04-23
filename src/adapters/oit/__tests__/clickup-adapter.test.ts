import { describe, expect, it, vi } from "vitest";
import { importFromClickUp } from "../adapters/clickup-adapter.js";
import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";

const FAKE_POLICY = "# POLICY\n---\n";
const FAKE_TEMPLATE = `---
name: import-clickup
model: claude-sonnet-4-6
---
Fetch {{url}} and output JSON.`;

describe("importFromClickUp", () => {
	it("parses a success response into an OriginRef seed", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: {
				id: "ABC-123",
				title: "Fix billing",
				description: "desc",
				status: "open",
				assignees: [],
			},
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromClickUp({
			url: "https://app.clickup.com/t/ABC-123",
			templateMarkdown: FAKE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(true);
		expect(result.origin?.tracker).toBe("clickup");
		expect(result.origin?.id).toBe("ABC-123");
		expect(result.origin?.title_snapshot).toBe("Fix billing");
	});

	it("returns error shape when Claude returns an {error} object", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: { error: "permission denied" },
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromClickUp({
			url: "https://app.clickup.com/t/X",
			templateMarkdown: FAKE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain("permission denied");
	});
});
