#!/bin/bash

# debug.sh — Invoke the Debugging Agent with error context
# Usage: ./scripts/debug.sh "description of the bug" [path/to/error.log]

set -e

BUG_DESCRIPTION=$1
ERROR_LOG=$2

if [ -z "$BUG_DESCRIPTION" ]; then
  echo "Usage: ./scripts/debug.sh \"description of bug\" [path/to/error.log]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/debug.sh \"Playlist fails to save when track count > 50\""
  echo "  ./scripts/debug.sh \"Auth token not refreshing\" logs/error.log"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║         Agent Team: Debug Session         ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Bug: $BUG_DESCRIPTION"

LOG_CONTEXT=""
if [ -n "$ERROR_LOG" ] && [ -f "$ERROR_LOG" ]; then
  echo "  Log: $ERROR_LOG"
  LOG_CONTEXT="The error log is located at: $ERROR_LOG — read it carefully."
fi

echo ""

# Build the prompt
PROMPT="You are the Debugging Agent defined in agents/debugging-agent.md.

Read that file now to understand your role and process.

## Bug Report

**Description:** $BUG_DESCRIPTION

$LOG_CONTEXT

Follow your debugging process systematically:
1. Understand the symptom
2. Form hypotheses
3. Investigate the codebase and logs
4. Identify the root cause
5. Implement a fix or produce a precise fix plan

Write your full report to output/debug-report.md"

echo "→ Invoking Debugging Agent..."
echo ""

claude --print "$PROMPT"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║             Debug Session Complete        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Report saved to: output/debug-report.md"
echo ""
