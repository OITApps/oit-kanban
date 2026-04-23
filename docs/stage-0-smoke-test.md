# Stage 0 Smoke Test

This document covers both the **automated** smoke-test script and the **manual** fallback checklist.
Run one or the other; they cover the same 6 verification checkpoints.

---

## Option A — Automated (browser-harness)

### Prerequisites

1. **browser-harness installed** (one-time):
   ```bash
   git clone https://github.com/browser-use/browser-harness ~/tools/browser-harness
   cd ~/tools/browser-harness && uv tool install -e .
   ```

2. **Chrome remote-debugging enabled** (one-time per Chrome profile):
   - Open Chrome
   - Navigate to `chrome://inspect/#remote-debugging`
   - Tick **"Discover network targets"** and click **Allow**
   - The setting is sticky — only needed once per profile

3. **Set the task URL** to a ClickUp task you have access to:
   ```bash
   export CLICKUP_TEST_TASK_URL="https://app.clickup.com/t/<real-task-id>"
   ```

### Run

```bash
cd ~/oit/oit-kanban
python3 scripts/smoke-stage-0.py
```

Exit code `0` = PASS, `1` = FAIL. The script prints a per-step summary.

---

## Option B — Manual Checklist

Estimated time: **10–15 minutes**

### Setup

```bash
cd ~/oit/oit-kanban
npm run dev:full
```

Wait for the terminal to print `Web UI: http://127.0.0.1:4173` (or similar port) and open that URL in Chrome.

---

### Checkpoint 1 — Board renders

**Action:** Load `http://127.0.0.1:4173` in Chrome.

**Expected:** Kanban board appears with six lane headers visible:
- Backlog, In Progress, Review, Done, Blocked, Trash

**Fail signal:** White screen, React error boundary, or missing lanes.

---

### Checkpoint 2 — ClickUp import via paste

**Action:** Copy a ClickUp task URL (`https://app.clickup.com/t/<task-id>`) to your clipboard,
then click anywhere on the board and press Cmd+V (macOS) / Ctrl+V (Linux/Windows).

**Expected:**
- A toast or loading indicator appears briefly
- A new card appears in the **Backlog** lane within ~10 seconds
- The card title matches the ClickUp task name

**Fail signal:** No card appears, or an error toast appears.

---

### Checkpoint 3 — Card metadata is correct

**Action:** Click the imported card to open its detail view.

**Expected:**
- Title matches the ClickUp task name
- Description / prompt is populated (may be truncated)
- At least one origin URL is listed (should be the ClickUp task URL you pasted)

**Fail signal:** Title is blank, description is missing, or origin list is empty.

---

### Checkpoint 4 — Update origin (happy path)

**Action:** On the imported card (either in the board view or the detail panel), click **"Update origin"**.

**Expected:**
- Button briefly shows "Updating…" while the emit is in flight
- Button returns to "Update origin" after ~5 seconds
- No **"Emit failed"** badge appears on the card

**Fail signal:** "Emit failed" badge appears (red button). Click it to see the error detail.

---

### Checkpoint 5 — Forced failure scenario (optional but recommended)

**Purpose:** Verify the "Emit failed" badge appears and is dismissible.

**How to force a failure:**
1. Open your Claude Code config (`~/.claude/settings.json` or the project `.claude/settings.json`)
2. Temporarily remove or disable the ClickUp MCP server entry
3. Restart the dev server: `npm run dev:full`
4. Import the same ClickUp task again (paste)
5. Click **"Update origin"**

**Expected:**
- "Emit failed" badge (red button) appears on the card within ~10–15 seconds
- Clicking the badge opens a dialog showing the error message
- "Retry" re-attempts the emit
- "Mark resolved" dismisses the badge without retrying

**Cleanup:** Re-enable ClickUp MCP in settings and restart the dev server.

---

### Checkpoint 6 — Lane drag-and-drop still works

**Action:** Drag the imported card from Backlog to In Progress.

**Expected:**
- Card moves to the In Progress lane
- Card count badges on both lanes update immediately

**Fail signal:** Card snaps back to Backlog, or drag handle does not respond.

---

## Rollback

If something is broken and you need to revert to the last known-good state on `oit/develop`:

```bash
# Hard-reset oit/develop to the last good commit (get SHA from git log)
git -C ~/oit/oit-kanban log --oneline -10

# Revert a specific commit non-destructively (preferred)
git -C ~/oit/oit-kanban revert <bad-sha> --no-edit

# Or reset the branch to a specific SHA (destructive — confirm with team first)
# git -C ~/oit/oit-kanban reset --hard <good-sha>
```

If the board won't start at all:
```bash
cd ~/oit/oit-kanban && npm run install:all && npm run dev:full
```

---

## After the smoke test passes

Proceed to the one-week daily drive. See `docs/stage-0-promotion-checklist.md` for the
promotion commands to run after a clean week.
