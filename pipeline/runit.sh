#!/bin/bash
# =============================================================================
#  runit.sh – INFINITE PIPELINE WATCHDOG - VERSION (2025-11-23)
# =============================================================================
#
#  Author         : SWISHER
#  Date           : 2025-11-23
#
#  PURPOSE
#  ───────
#  Keeps your entire newznab pipeline running FOREVER.
#  Executes runall.sh repeatedly with a smart pause between runs.
#
#  FEATURES
#  ────────
#  • Infinite loop with automatic restart on crash or finish
#  • 30-minute default pause (1800 seconds) — perfect balance
#  • Pressing ENTER instantly starts the next run (no waiting)
#  • Clear timestamps and status messages
#  • Works in foreground (no screen/tmux needed) — just let it run
#  • Safe: if runall.sh crashes, watchdog immediately restarts it
#
#  HOW TO USE
#  ──────────
#  Make executable and run:
#      chmod +x runit.sh
#      ./runit.sh
#
#  Stop anytime with Ctrl+C
#
#  This + runall.sh = 100% hands-free, 24/7 perfect indexing.
#
#  You no longer need to remember anything.
#  The machine does it all.
#  Forever.
#
# =============================================================================

SCRIPT="runall.sh"

# Resolve full path (so it works no matter where you start it from)
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$SCRIPT"

# Safety check
if [[ ! -f "$SCRIPT_PATH" ]]; then
    echo "ERROR: $SCRIPT not found at $SCRIPT_PATH"
    exit 1
fi

echo "WATCHDOG STARTED – Keeping $SCRIPT alive forever"
echo "Press ENTER for immediate run • Default wait: 30 minutes"
echo "Ctrl+C to stop"
echo

while true; do
    echo "════════════════════════════════════════════════════════════════"
    echo "════════════════════════════════════════════════════════════════"
    echo "=== WATCHDOG RUN – $(date '+%Y-%m-%d %H:%M:%S') ==="
    echo "════════════════════════════════════════════════════════════════"
    echo "════════════════════════════════════════════════════════════════"
    bash "$SCRIPT_PATH"
    echo
    echo "════════════════════════════════════════════════════════════════"
    echo "════════════════════════════════════════════════════════════════"
    echo "=== RUNALL.SH FINISHED – $(date '+%Y-%m-%d %H:%M:%S') ==="
    echo "════════════════════════════════════════════════════════════════"
    echo "════════════════════════════════════════════════════════════════"
    echo
    echo "Next run in 30 minutes (or press ENTER now to start immediately)"
    echo
    read -t 1800 -p "▶ Press ENTER for instant run • Waiting 30 min... " || true
    echo
done