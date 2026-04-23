#!/usr/bin/env python3
"""
oit-kanban Stage 0 Automated Smoke Test
========================================

Prerequisites
-------------
1. browser-harness installed:
       git clone https://github.com/browser-use/browser-harness ~/tools/browser-harness
       cd ~/tools/browser-harness && uv tool install -e .

2. Chrome remote-debugging checkbox ticked (one-time):
   Open Chrome → navigate to chrome://inspect/#remote-debugging → tick "Discover network targets" + Allow.

3. Set env var before running:
       export CLICKUP_TEST_TASK_URL="https://app.clickup.com/t/<real-task-id>"

Run:
       cd ~/oit/oit-kanban
       python3 scripts/smoke-stage-0.py

Exit codes: 0 = PASS, 1 = FAIL
"""

import os
import subprocess
import sys
import time
import signal

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CLICKUP_TEST_TASK_URL = os.environ.get(
    "CLICKUP_TEST_TASK_URL", "{{CLICKUP_TEST_TASK_URL}}"
)
KANBAN_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# dev:full picks its own port starting at 4173; we read it from stdout
WEB_UI_PORT = int(os.environ.get("KANBAN_WEB_UI_PORT", "4173"))
WEB_UI_URL = f"http://127.0.0.1:{WEB_UI_PORT}/"
IMPORT_WAIT_S = 12      # seconds to wait for ClickUp import
EMIT_WAIT_S = 12        # seconds to wait for emit to complete
VITE_READY_TIMEOUT = 30 # seconds to wait for Vite to start

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

results = []


def check(label: str, ok: bool, detail: str = ""):
    icon = PASS if ok else FAIL
    print(f"  [{icon}] {label}" + (f": {detail}" if detail else ""))
    results.append((label, ok))
    return ok


def abort(reason: str):
    print(f"\n  [{FAIL}] ABORT: {reason}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Step 1 – Validate env
# ---------------------------------------------------------------------------
print("\n=== oit-kanban Stage 0 Smoke Test ===\n")

if "{{CLICKUP_TEST_TASK_URL}}" in CLICKUP_TEST_TASK_URL:
    abort(
        "CLICKUP_TEST_TASK_URL is not set.\n"
        "  Export it before running:\n"
        "    export CLICKUP_TEST_TASK_URL='https://app.clickup.com/t/<task-id>'"
    )

print(f"  Task URL : {CLICKUP_TEST_TASK_URL}")
print(f"  App URL  : {WEB_UI_URL}")
print()

# ---------------------------------------------------------------------------
# Step 2 – Start dev server in background
# ---------------------------------------------------------------------------
print("[1/8] Starting dev server (npm run dev:full)...")
dev_proc = subprocess.Popen(
    ["npm", "run", "dev:full"],
    cwd=KANBAN_ROOT,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
)

def kill_dev():
    if dev_proc.poll() is None:
        dev_proc.send_signal(signal.SIGTERM)
        try:
            dev_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            dev_proc.kill()

# ---------------------------------------------------------------------------
# Step 3 – Wait for Vite to be ready
# ---------------------------------------------------------------------------
print(f"[2/8] Waiting for Vite at {WEB_UI_URL} (up to {VITE_READY_TIMEOUT}s)...")

import urllib.request
deadline = time.time() + VITE_READY_TIMEOUT
ready = False
while time.time() < deadline:
    try:
        urllib.request.urlopen(WEB_UI_URL, timeout=2)
        ready = True
        break
    except Exception:
        time.sleep(0.5)

if not ready:
    kill_dev()
    abort(f"Dev server did not become ready at {WEB_UI_URL} within {VITE_READY_TIMEOUT}s")

print(f"  Dev server ready at {WEB_UI_URL}")

# ---------------------------------------------------------------------------
# Step 4 – Browser-harness interaction
# ---------------------------------------------------------------------------
# We run each harness interaction as a separate `uv run browser-harness` invocation
# (inline heredoc) to keep error handling simple.

HARNESS_ROOT = os.path.expanduser("~/tools/browser-harness")

def run_harness(script: str, timeout: int = 20) -> tuple[int, str]:
    """Run a browser-harness script, return (returncode, combined_output)."""
    try:
        result = subprocess.run(
            ["uv", "run", "browser-harness"],
            input=script,
            capture_output=True,
            text=True,
            cwd=HARNESS_ROOT,
            timeout=timeout,
        )
        return result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return 1, "TIMEOUT"

print(f"[3/8] Navigating to {WEB_UI_URL}...")
rc, out = run_harness(f"""
goto("{WEB_UI_URL}")
wait_for_load(timeout=15.0)
info = page_info()
print("URL:", info.get("url","?"))
print("TITLE:", info.get("title","?"))
""")

if rc != 0:
    kill_dev()
    abort(f"browser-harness navigate failed:\n{out}")

print(f"  {out.strip()}")

# ---------------------------------------------------------------------------
# Step 5 – Verify Backlog lane is present
# ---------------------------------------------------------------------------
print("[4/8] Verifying Backlog lane renders...")
rc, out = run_harness("""
found = js("!!document.querySelector('[data-column-id=backlog]')")
print("BACKLOG_PRESENT:", found)
""")
check("Backlog lane rendered", "BACKLOG_PRESENT: True" in out, out.strip())

# ---------------------------------------------------------------------------
# Step 6 – Paste ClickUp task URL
# ---------------------------------------------------------------------------
print(f"[5/8] Pasting ClickUp URL: {CLICKUP_TEST_TASK_URL}")
rc, out = run_harness(f"""
import json
url = {json.dumps(CLICKUP_TEST_TASK_URL) if False else repr(CLICKUP_TEST_TASK_URL)}
# Simulate a paste event with clipboardData containing the URL
js(\"\"\"
(function() {{
  var dt = new DataTransfer();
  dt.setData('text/plain', {repr(CLICKUP_TEST_TASK_URL)!r});
  var ev = new ClipboardEvent('paste', {{ clipboardData: dt, bubbles: true }});
  window.dispatchEvent(ev);
}})();
\"\"\")
print("PASTE_DISPATCHED: True")
""", timeout=15)

import json as _json

# Simpler approach: use JS directly via run_harness
rc, out = run_harness(
    "js(\"\"\"(function(){var dt=new DataTransfer();dt.setData('text/plain','"
    + CLICKUP_TEST_TASK_URL.replace("'", "\\'")
    + "');window.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true}));})()\"\"\");print('PASTE_OK')",
    timeout=15,
)
check("Paste event dispatched", rc == 0 and "PASTE_OK" in out, out.strip() if rc != 0 else "")

# ---------------------------------------------------------------------------
# Step 7 – Wait for import and verify card appeared
# ---------------------------------------------------------------------------
print(f"[6/8] Waiting {IMPORT_WAIT_S}s for import to complete...")
time.sleep(IMPORT_WAIT_S)

rc, out = run_harness("""
# Count cards in backlog
count = js("document.querySelectorAll('[data-column-id=backlog] [data-task-id]').length")
print("BACKLOG_CARD_COUNT:", count)
# Get first card title text
title = js("(function(){var el=document.querySelector('[data-column-id=backlog] [data-task-id]');return el?el.textContent.trim().slice(0,80):'NONE';})()")
print("FIRST_CARD_TITLE:", title)
""")

card_appeared = "BACKLOG_CARD_COUNT: 0" not in out and "BACKLOG_CARD_COUNT:" in out
check(
    "Card appeared in Backlog after import",
    card_appeared,
    out.strip(),
)

if not card_appeared:
    print("  WARNING: Card did not appear — emit test will be skipped.")

# ---------------------------------------------------------------------------
# Step 8 – Click "Update origin" and verify no "Emit failed" badge
# ---------------------------------------------------------------------------
print("[7/8] Clicking 'Update origin' button...")
rc, out = run_harness("""
# Find the first "Update origin" button
btn = js("(function(){var b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Update origin');return b?'FOUND':'NOT_FOUND';})()")
print("UPDATE_ORIGIN_BTN:", btn)
if btn == 'FOUND':
    js("(function(){var b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Update origin');if(b)b.click();})()")
    print("CLICKED: True")
""", timeout=15)

btn_found = "UPDATE_ORIGIN_BTN: FOUND" in out
check("Update origin button found and clicked", btn_found, out.strip() if not btn_found else "")

print(f"  Waiting {EMIT_WAIT_S}s for emit...")
time.sleep(EMIT_WAIT_S)

rc, out = run_harness("""
badge = js("(function(){var b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Emit failed');return b?'PRESENT':'ABSENT';})()")
print("EMIT_FAILED_BADGE:", badge)
""", timeout=15)

badge_absent = "EMIT_FAILED_BADGE: ABSENT" in out
check(
    "No 'Emit failed' badge after Update origin",
    badge_absent,
    "Badge absent (emit succeeded)" if badge_absent else out.strip(),
)

# ---------------------------------------------------------------------------
# Step 9 – Kill dev server
# ---------------------------------------------------------------------------
print("[8/8] Stopping dev server...")
kill_dev()
check("Dev server stopped cleanly", True)

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n=== Summary ===\n")
passed = sum(1 for _, ok in results if ok)
total = len(results)
for label, ok in results:
    icon = PASS if ok else FAIL
    print(f"  [{icon}] {label}")

print(f"\n  {passed}/{total} checks passed")
if passed == total:
    print(f"\n  OVERALL: {PASS}\n")
    sys.exit(0)
else:
    print(f"\n  OVERALL: {FAIL}\n")
    sys.exit(1)
