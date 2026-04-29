#!/bin/bash
# NZBarr Desktop Launcher for launchd

# Set PATH
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"

# Unset problematic env var
unset ELECTRON_RUN_AS_NODE

# Change to app directory
cd /Users/hermansteijn/NZBarr-Desktop

# Launch Electron
exec ./node_modules/.bin/electron . 2>&1
