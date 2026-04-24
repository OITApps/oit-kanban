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

	it("unwraps the --output-format json envelope and parses the inner result JSON", () => {
		// This is the shape that `claude -p --output-format json` actually emits:
		// a JSON array of event objects; the last type==="result" item contains
		// the assistant's text in its "result" field.
		const innerPayload = {
			id: "OITApps/mpp_dev#139",
			title: "chore(nm): add frontend API field access audit script",
			description: "Adds audit script.",
			status: "open",
			head_ref: "chore/api-field-access-audit-script",
			base_ref: "main",
			assignees: [],
		};
		const envelope = JSON.stringify([
			{ type: "system", subtype: "init", session_id: "abc123" },
			{ type: "assistant", message: { content: [{ type: "text", text: JSON.stringify(innerPayload) }] } },
			{ type: "result", subtype: "success", result: JSON.stringify(innerPayload) },
		]);

		const result = invokeClaudeMocked({ stdout: envelope, stderr: "", exitCode: 0 });
		expect(result.success).toBe(true);
		expect(result.parsed).toEqual(innerPayload);
	});

	it("unwraps envelope when inner result is wrapped in markdown code fences", () => {
		const innerPayload = {
			id: "OITApps/mpp_dev#139",
			title: "chore(nm): add frontend API field access audit script",
			description: "",
			status: "open",
			head_ref: "chore/api-field-access-audit-script",
			base_ref: "main",
			assignees: [],
		};
		const fencedText = `\`\`\`json\n${JSON.stringify(innerPayload)}\n\`\`\``;
		const envelope = JSON.stringify([
			{ type: "system", subtype: "init", session_id: "abc123" },
			{ type: "result", subtype: "success", result: fencedText },
		]);

		const result = invokeClaudeMocked({ stdout: envelope, stderr: "", exitCode: 0 });
		expect(result.success).toBe(true);
		expect(result.parsed).toEqual(innerPayload);
	});
});
