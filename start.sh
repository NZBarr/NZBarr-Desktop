#!/bin/bash
# NZBarr Desktop Launcher
# Runs in foreground with visible terminal output (for debugging/logs)

cd ~/NZBarr-Desktop

# Kill any existing instances
pkill -f "electron.*NZBarr" 2>/dev/null
sleep 1

# Unset the problematic environment variable
unset ELECTRON_RUN_AS_NODE

# Launch Electron in foreground — all logs appear in this terminal
./node_modules/.bin/electron .
