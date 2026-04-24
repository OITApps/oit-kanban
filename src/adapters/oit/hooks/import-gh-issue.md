---
name: import-gh-issue
description: Fetch GitHub issue metadata for oit-kanban card creation via gh CLI
triggers_on: import
tracker: gh-issue
model: claude-sonnet-4-6
---

Fetch the GitHub issue at {{url}} using the gh CLI. Run:

  gh issue view <issue-number> --repo <owner>/<repo> --json number,title,body,state,author,labels

Parse the URL to extract owner, repo, and issue number. Then output a single JSON object to stdout with EXACTLY this shape and no other text, no markdown fences, no narration:

{
  "id": "<owner>/<repo>#<number>",
  "title": "<issue title>",
  "description": "<issue body, or empty string>",
  "status": "<state — open or closed>",
  "assignees": ["<assignee login>, ..."]
}

If the issue cannot be fetched (not found, permission denied, rate limited, gh CLI not authenticated), output EXACTLY:

{ "error": "<short reason>" }

Do not print anything other than one of the two JSON objects above.
