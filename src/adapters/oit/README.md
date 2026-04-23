# OIT Adapter Layer

All OIT-specific code lives under this directory. Upstream (`cline/kanban`) files
MUST NOT be modified except for three documented seam points:

1. `src/core/api-contract.ts` — board column enum extended to 6 values
2. `web-ui/src/App.tsx` — root wrapped with `<DropZone>`
3. `web-ui/src/components/board-card.tsx` — renders `<UpdateOriginButton>` + `<EmitFailedBadge>`
4. `web-ui/src/components/card-detail-view.tsx` — renders `<EmitSettingsPanel>`

If a weekly upstream merge surfaces conflicts outside these four files, stop
the merge and resolve manually.

## Layout

- `hooks/` — POLICY.md + markdown prompt templates executed by `claude -p`
- `adapters/` — URL routing (regex) + per-tracker dispatch
- `lanes/` — 6-lane column schema (Backlog → Design → Building → Review → QA → Shipped)
- `emit/` — template renderer, claude invoker, emit orchestrator
- `schema/` — Zod schemas for OIT card extensions (origins, emit_log)
- `__tests__/` — Vitest unit + chaos tests
