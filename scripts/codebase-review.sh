#!/bin/bash

# codebase-review.sh — Run a full codebase audit and remediation sweep
# Usage: ./scripts/codebase-review.sh [--audit-only]
#
# --audit-only   Run the audit and produce the backlog, but stop before
#                spawning implementers. Useful for reviewing the backlog
#                before committing to changes.

set -e

AUDIT_ONLY=false
if [ "$1" == "--audit-only" ]; then
  AUDIT_ONLY=true
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REVIEW_DIR="output/codebase-review"
ARCHIVE_DIR="output/archive/codebase-review-${TIMESTAMP}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       Agent Team: Full Codebase Review        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if [ "$AUDIT_ONLY" = true ]; then
  echo "  Mode: AUDIT ONLY (backlog will be produced, no changes made)"
else
  echo "  Mode: FULL (audit + remediation)"
fi
echo ""

# Check for uncommitted changes — warn before modifying anything
if git status --porcelain | grep -q "^[^?]"; then
  echo "  ⚠️  Warning: You have uncommitted changes."
  echo "  It's strongly recommended to commit or stash before running a full review."
  echo ""
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  Aborted. Commit your changes and re-run."
    exit 1
  fi
fi

# Create fresh review output directory
rm -rf "$REVIEW_DIR"
mkdir -p "$REVIEW_DIR"

echo "→ Invoking Full Codebase Reviewer..."
echo ""

if [ "$AUDIT_ONLY" = true ]; then
  MODE_INSTRUCTION="Run Phase 1 (Codebase Mapping), Phase 2 (Parallel Audit Swarm), and Phase 3 (Backlog Synthesis) only. DO NOT proceed to Phase 4 (Implementation). End after writing the backlog to output/codebase-review/backlog.md and present it to the human for review."
else
  MODE_INSTRUCTION="Run all phases: Codebase Mapping, Parallel Audit Swarm, Backlog Synthesis, Parallel Implementation Swarm, Verification Pass, and Final Report."
fi

claude --print "
You are the Full Codebase Reviewer defined in agents/codebase-reviewer.md.

Read that file now to understand your role and the full multi-phase process.

The project root is the current directory. Begin by surveying the codebase
structure before spawning any sub-agents.

Write all review output to: output/codebase-review/

$MODE_INSTRUCTION
"

# Archive the review output
mkdir -p "$ARCHIVE_DIR"
cp -r "$REVIEW_DIR"/* "$ARCHIVE_DIR/" 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║            Codebase Review Complete           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Review output:  $REVIEW_DIR"
echo "  Archive:        $ARCHIVE_DIR"
echo ""

if [ "$AUDIT_ONLY" = true ]; then
  echo "  Audit-only mode — no changes were made."
  echo "  Review output/codebase-review/backlog.md"
  echo "  then run without --audit-only to apply fixes."
fi
echo ""
