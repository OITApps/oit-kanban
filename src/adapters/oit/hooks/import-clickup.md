---
name: import-clickup
description: Fetch ClickUp task metadata for oit-kanban card creation
triggers_on: import
tracker: clickup
model: claude-sonnet-4-6
---

Fetch the ClickUp task at {{url}} using the ClickUp MCP server that is already
configured in this environment. Look up the task by its ID.

Output a single JSON object to stdout with EXACTLY this shape and no other
text, no markdown fences, no narration:

{
  "id": "<ClickUp task ID as string>",
  "title": "<task name>",
  "description": "<task description or empty string>",
  "status": "<current status string>",
  "assignees": ["<assignee emails>"]
}

If the task cannot be fetched (permission denied, not found, API error),
output EXACTLY this JSON instead:

{
  "error": "<short reason>"
}

Do not print anything other than one of the two JSON objects above.
