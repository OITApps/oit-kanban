# Stage 0 Promotion Checklist

**DO NOT run these commands until:**
- The Stage 0 smoke test passed (see `docs/stage-0-smoke-test.md`)
- One week of clean daily use with no regressions
- Any issues opened during the daily drive have been resolved or triaged

---

## Pre-promotion gate

- [ ] Smoke test: all 6 checkpoints passed
- [ ] Daily drive: used oit-kanban as primary Kanban view for 7 consecutive working days
- [ ] No open P0/P1 bugs on `oit/develop` branch
- [ ] `git log oit/develop` reviewed — no stray WIP commits

---

## Promotion commands

Run these in order. Read each command before executing it.

```bash
# 1. Ensure you're on a clean oit/develop with latest changes pulled
cd ~/oit/oit-kanban
git checkout oit/develop
git pull origin oit/develop
git status  # must be clean

# 2. Switch to main and merge develop with a no-ff merge commit
git checkout oit/main
git pull origin oit/main
git merge oit/develop --no-ff -m "release: oit-kanban v0.1.0 (Stage 0)"

# 3. Tag the release on oit/main
git tag -a oit-kanban-v0.1.0 -m "Stage 0 pilot — ClickUp import + manual emit, 6 lanes, POLICY-guarded templates"

# 4. Push branch + tag
git push origin oit/main
git push origin oit-kanban-v0.1.0

# 5. Verify on GitHub
gh browse --repo OITApps/oit-kanban
```

---

## Rollback (if a regression is found after promotion)

```bash
# Option A: Revert the merge commit (keeps history, safest)
cd ~/oit/oit-kanban
git checkout oit/main
git revert -m 1 <merge-commit-sha> --no-edit
git push origin oit/main

# Option B: Delete the tag if it was pushed erroneously
git tag -d oit-kanban-v0.1.0
git push origin :refs/tags/oit-kanban-v0.1.0
```

---

## Post-promotion

- Open Stage 1 planning ticket in ClickUp under the `oit-kanban` project
- Announce to the team that Stage 0 is promoted and `oit/main` is now the stable baseline
- Archive any worktrees that were used for Stage 0 feature branches
