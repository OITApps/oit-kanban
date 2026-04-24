import { describe, expect, it, vi } from "vitest";
import { importFromGhIssue, importFromGhPr } from "../adapters/gh-adapter.js";
import type { ClaudeInvocation, ClaudeResult } from "../emit/claude-invoker.js";

const FAKE_POLICY = "# POLICY\n---\n";
const FAKE_ISSUE_TEMPLATE = `---
name: import-gh-issue
model: claude-sonnet-4-6
---
Fetch {{url}} and output JSON.`;

const FAKE_PR_TEMPLATE = `---
name: import-gh-pr
model: claude-sonnet-4-6
---
Fetch {{url}} and output JSON.`;

describe("importFromGhIssue", () => {
	it("parses a success response into an OriginRef with tracker gh-issue", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: {
				id: "OITApps/oit-kanban#42",
				title: "Fix null pointer in import flow",
				description: "When pasting a GH URL the app crashes",
				status: "open",
				assignees: ["byeagerOIT"],
			},
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromGhIssue({
			url: "https://github.com/OITApps/oit-kanban/issues/42",
			templateMarkdown: FAKE_ISSUE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(true);
		expect(result.origin?.tracker).toBe("gh-issue");
		expect(result.origin?.id).toBe("OITApps/oit-kanban#42");
		expect(result.origin?.title_snapshot).toBe("Fix null pointer in import flow");
		expect(result.origin?.description_snapshot).toBe("When pasting a GH URL the app crashes");
		expect(result.error).toBeNull();
	});

	it("returns error shape when Claude returns an {error} object", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: { error: "gh CLI not authenticated" },
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromGhIssue({
			url: "https://github.com/OITApps/oit-kanban/issues/99",
			templateMarkdown: FAKE_ISSUE_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(false);
		expect(result.origin).toBeNull();
		expect(result.error).toContain("gh CLI not authenticated");
	});
});

describe("importFromGhPr", () => {
	it("parses a success response into an OriginRef with tracker gh-pr and branch info in description_snapshot", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: {
				id: "OITApps/oit-kanban#15",
				title: "feat(oit): add GH import adapters",
				description: "Adds gh-issue and gh-pr import support.",
				status: "open",
				head_ref: "oit/develop",
				base_ref: "main",
				assignees: ["byeagerOIT"],
			},
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromGhPr({
			url: "https://github.com/OITApps/oit-kanban/pull/15",
			templateMarkdown: FAKE_PR_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(true);
		expect(result.origin?.tracker).toBe("gh-pr");
		expect(result.origin?.id).toBe("OITApps/oit-kanban#15");
		expect(result.origin?.title_snapshot).toBe("feat(oit): add GH import adapters");
		expect(result.origin?.description_snapshot).toContain("Adds gh-issue and gh-pr import support.");
		expect(result.origin?.description_snapshot).toContain("[PR: head=oit/develop, base=main]");
		expect(result.error).toBeNull();
	});

	it("returns error shape when Claude returns an {error} object", async () => {
		const invoke = vi.fn<(invocation: ClaudeInvocation) => Promise<ClaudeResult>>().mockResolvedValue({
			success: true,
			parsed: { error: "PR not found" },
			toolCalls: [],
			error: null,
			stdout: "",
			stderr: "",
			exitCode: 0,
		});

		const result = await importFromGhPr({
			url: "https://github.com/OITApps/oit-kanban/pull/999",
			templateMarkdown: FAKE_PR_TEMPLATE,
			policyMarkdown: FAKE_POLICY,
			cwd: "/tmp",
			invoke,
		});

		expect(result.success).toBe(false);
		expect(result.origin).toBeNull();
		expect(result.error).toContain("PR not found");
	});
});
