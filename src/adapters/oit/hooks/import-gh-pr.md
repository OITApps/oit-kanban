---
name: import-gh-pr
description: Fetch GitHub PR metadata for oit-kanban card creation via gh CLI
triggers_on: import
tracker: gh-pr
model: claude-sonnet-4-6
---

Fetch the GitHub PR at {{url}} using the gh CLI. Run:

  gh pr view <pr-number> --repo <owner>/<repo> --json number,title,body,state,author,labels,headRefName,baseRefName,isDraft

Parse the URL to extract owner, repo, and PR number. Then output a single JSON object to stdout:

{
  "id": "<owner>/<repo>#<number>",
  "title": "<PR title>",
  "description": "<PR body, or empty string>",
  "status": "<state + draft marker: 'open' / 'draft' / 'merged' / 'closed'>",
  "head_ref": "<branch name>",
  "base_ref": "<base branch name>",
  "assignees": ["<login>, ..."]
}

On failure output EXACTLY: { "error": "<short reason>" }

Do not print anything other than one of the two JSON objects above.
