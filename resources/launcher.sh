#!/bin/bash
# NZBarr Desktop Launcher
# Clears problematic environment variables before launching

unset ELECTRON_RUN_AS_NODE
exec "$(dirname "$0")/NZBarr" "$@"
