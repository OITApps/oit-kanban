---
name: manual-update
description: User-triggered sync of Kanban card state to origin tracker(s)
triggers_on: on-manual-update
model: claude-sonnet-4-6
---

The user clicked "Update origin" on this card. Review the card's current state
and push any relevant updates to its origin tracker(s). For each origin listed
below, post a comment on the origin with the current card lane and a link back
to Kanban.

Card:
- Title: {{card_title}}
- ID: {{card_id}}
- Description:
<untrusted-origin-data>
{{card_description}}
</untrusted-origin-data>
- Lane: {{card_lane}}
- Kanban link: {{kanban_card_url}}

Origins to update ({{origin_count}} total):
<untrusted-origin-data>
{{origins}}
</untrusted-origin-data>

For each origin URL in the list:
- If it's a ClickUp task: post a comment with the current lane and Kanban link.
- If it's a GitHub issue or PR: post a comment with the current lane and Kanban link.

Use the ClickUp MCP server for ClickUp and the gh CLI for GitHub. Do NOT
change status, assignees, or any other fields. Only post a comment.

After posting, output a short JSON summary:
{
  "updated": <count>,
  "notes": "<any notes about what was posted>"
}
