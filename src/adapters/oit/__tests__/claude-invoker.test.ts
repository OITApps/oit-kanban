import { describe, expect, it } from "vitest";
import { invokeClaudeMocked } from "../emit/claude-invoker.js";

describe("invokeClaudeMocked (pure path, no subprocess)", () => {
	it("parses success JSON from stdout", () => {
		const stdout = JSON.stringify({
			id: "ABC-123",
			title: "Test",
			description: "",
			status: "open",
			assignees: [],
		});
		const result = invokeClaudeMocked({
			stdout,
			stderr: "",
			exitCode: 0,
		});
		expect(result.success).toBe(true);
		expect(result.parsed).toEqual({
			id: "ABC-123",
			title: "Test",
			description: "",
			status: "open",
			assignees: [],
		});
		expect(result.toolCalls).toEqual([]);
	});

	it("reports error when stdout is invalid JSON", () => {
		const result = invokeClaudeMocked({
			stdout: "I cannot fetch that task",
			stderr: "",
			exitCode: 0,
		});
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/JSON/i);
	});

	it("surfaces non-zero exit code as failure", () => {
		const result = invokeClaudeMocked({
			stdout: "",
			stderr: "claude: not found",
			exitCode: 127,
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("exit code 127");
	});

	it("extracts tool calls from a typed tool-call log", () => {
		// Simulated response shape: JSON with a "tool_calls" array at the top level.
		const stdout = JSON.stringify({
			result: { id: "X", title: "Y", description: "", status: "open", assignees: [] },
			tool_calls: [
				{ tool: "clickup_update_task", args: { id: "X", status: "review" } },
				{ tool: "gh", args: { subcommand: "issue comment -b ..." } },
			],
		});
		const result = invokeClaudeMocked({ stdout, stderr: "", exitCode: 0 });
		expect(result.success).toBe(true);
		expect(result.toolCalls).toHaveLength(2);
		expect(result.toolCalls[0].tool).toBe("clickup_update_task");
	});
});
