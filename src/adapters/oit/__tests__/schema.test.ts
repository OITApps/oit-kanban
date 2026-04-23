import { describe, expect, it } from "vitest";
import {
	emitAttemptSchema,
	oitCardExtensionsSchema,
	originRefSchema,
	toolCallSchema,
} from "../schema/oit-card-extensions.js";

describe("OIT card extension schemas", () => {
	it("accepts a minimal ClickUp OriginRef", () => {
		const ref = originRefSchema.parse({
			tracker: "clickup",
			id: "ABC-123",
			url: "https://app.clickup.com/t/ABC-123",
			title_snapshot: "Fix billing bug",
			description_snapshot: "",
			imported_at: Date.now(),
			last_refreshed_at: null,
		});
		expect(ref.tracker).toBe("clickup");
	});

	it("rejects OriginRef with an unknown tracker", () => {
		expect(() =>
			originRefSchema.parse({
				tracker: "jira",
				id: "X",
				url: "https://example.com",
				title_snapshot: "t",
				description_snapshot: "",
				imported_at: 0,
				last_refreshed_at: null,
			}),
		).toThrow();
	});

	it("accepts an EmitAttempt with zero tool calls", () => {
		const attempt = emitAttemptSchema.parse({
			event: "on-manual-update",
			template: "manual-update.md",
			tool_calls: [],
			success: true,
			error: null,
			at: Date.now(),
		});
		expect(attempt.tool_calls).toHaveLength(0);
		// toolCallSchema: verify a valid tool call parses correctly
		const tc = toolCallSchema.parse({ tool: "clickup_update_task", args: {} });
		expect(tc.tool).toBe("clickup_update_task");
	});

	it("accepts a full OitCardExtensions block", () => {
		const ext = oitCardExtensionsSchema.parse({
			origins: [],
			emit_log: [],
			emit_disabled: [],
		});
		expect(ext.origins).toHaveLength(0);
		expect(ext.emit_disabled).toHaveLength(0);
	});
});
