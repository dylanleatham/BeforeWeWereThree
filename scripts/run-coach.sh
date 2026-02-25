#!/bin/bash

# run-coach.sh — Invoke the Coach to evaluate team performance
# Usage: ./scripts/run-coach.sh [optional: "human observation notes"]

set -e

HUMAN_NOTES=$1
ARCHIVE_DIR="output/archive"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║        Agent Team: Coach Evaluation       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check for archived outputs
if [ ! -d "$ARCHIVE_DIR" ] || [ -z "$(ls -A $ARCHIVE_DIR 2>/dev/null)" ]; then
  echo "  No archived feature outputs found in $ARCHIVE_DIR"
  echo "  The Coach needs historical data to evaluate. Run some features first."
  echo ""
  exit 1
fi

FEATURE_COUNT=$(ls -d $ARCHIVE_DIR/*/ 2>/dev/null | wc -l | tr -d ' ')
echo "  Archived features found: $FEATURE_COUNT"

if [ -n "$HUMAN_NOTES" ]; then
  echo "  Human observations: provided"
fi

echo ""

# Build context from archives
ARCHIVE_CONTEXT="The archived feature outputs are in: $ARCHIVE_DIR

Each subdirectory represents one completed feature cycle and contains the
output files from every agent that ran (spec.md, research.md, implementation-summary.md,
test-summary.md, review-summary.md, documentation-summary.md, and debug-report.md if applicable).

Read all of these files to understand how the team has been performing."

HUMAN_CONTEXT=""
if [ -n "$HUMAN_NOTES" ]; then
  HUMAN_CONTEXT="## Human Observations

The developer has provided the following direct observations about team performance.
Weight these heavily — they have context the output files don't capture:

$HUMAN_NOTES"
fi

PROMPT="You are the Coach defined in agents/coach.md.

Read that file now to understand your role and evaluation process.

$ARCHIVE_CONTEXT

$HUMAN_CONTEXT

Evaluate the team's performance across all archived cycles. Follow your evaluation
process: inventory patterns, distinguish signal from noise, trace issues to their
source, and propose specific persona changes where patterns are confirmed.

Write your full report to output/coach-report.md"

echo "→ Invoking Coach..."
echo ""

claude --print "$PROMPT"

# Archive the coach report with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
COACH_ARCHIVE="$ARCHIVE_DIR/coach_reports"
mkdir -p "$COACH_ARCHIVE"
cp output/coach-report.md "$COACH_ARCHIVE/coach-report_${TIMESTAMP}.md" 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           Coach Evaluation Complete       ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Report saved to:  output/coach-report.md"
echo "  Archive copy:     $COACH_ARCHIVE/coach-report_${TIMESTAMP}.md"
echo ""
echo "  Review the recommendations and apply approved"
echo "  persona changes to the agents/ directory."
echo ""
