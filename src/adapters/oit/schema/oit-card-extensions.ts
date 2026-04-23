import { z } from "zod";

export const trackerIdSchema = z.enum(["clickup", "gh-issue", "gh-pr"]);
export type TrackerId = z.infer<typeof trackerIdSchema>;

export const originRefSchema = z.object({
	tracker: trackerIdSchema,
	id: z.string().min(1),
	url: z.string().url(),
	title_snapshot: z.string(),
	description_snapshot: z.string(),
	imported_at: z.number().int().nonnegative(),
	last_refreshed_at: z.number().int().nonnegative().nullable(),
});
export type OriginRef = z.infer<typeof originRefSchema>;

export const toolCallSchema = z.object({
	tool: z.string().min(1),
	args: z.record(z.string(), z.unknown()),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

export const lifecycleEventSchema = z.enum([
	"on-imported",
	"on-entered-backlog",
	"on-entered-design",
	"on-entered-building",
	"on-entered-review",
	"on-entered-qa",
	"on-entered-shipped",
	"on-pr-opened",
	"on-pr-merged",
	"on-card-abandoned",
	"on-manual-update",
]);
export type LifecycleEvent = z.infer<typeof lifecycleEventSchema>;

export const emitAttemptSchema = z.object({
	event: lifecycleEventSchema,
	template: z.string().min(1),
	tool_calls: z.array(toolCallSchema),
	success: z.boolean(),
	error: z.string().nullable(),
	at: z.number().int().nonnegative(),
});
export type EmitAttempt = z.infer<typeof emitAttemptSchema>;

export const oitCardExtensionsSchema = z.object({
	origins: z.array(originRefSchema),
	emit_log: z.array(emitAttemptSchema).max(50), // capped per spec §5
	emit_disabled: z.array(lifecycleEventSchema),
});
export type OitCardExtensions = z.infer<typeof oitCardExtensionsSchema>;
