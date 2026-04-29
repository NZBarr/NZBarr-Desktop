#!/bin/bash
# NZBarr-GIT Desktop Launcher
# Runs in foreground with visible terminal output (for debugging/logs)

cd "$(dirname "$0")"

# Unset the problematic environment variable
unset ELECTRON_RUN_AS_NODE
export NZBARR_APP_VARIANT=git

# Launch Electron in foreground — all logs appear in this terminal
./node_modules/.bin/electron .
