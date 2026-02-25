#!/bin/bash

# build-feature.sh — Run the full agent team pipeline for a feature
# Usage: ./scripts/build-feature.sh specs/your-feature.md

set -e

SPEC_FILE=$1

if [ -z "$SPEC_FILE" ]; then
  echo "Usage: ./scripts/build-feature.sh specs/your-feature.md"
  exit 1
fi

if [ ! -f "$SPEC_FILE" ]; then
  echo "Error: spec file not found: $SPEC_FILE"
  exit 1
fi

# Extract feature name from spec file (filename without extension)
FEATURE_NAME=$(basename "$SPEC_FILE" .md)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_DIR="output/archive/${FEATURE_NAME}_${TIMESTAMP}"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          Agent Team: Build Feature        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Feature: $FEATURE_NAME"
echo "  Spec:    $SPEC_FILE"
echo ""

# Archive previous output if it exists
if [ -d "output" ] && [ "$(ls -A output/*.md 2>/dev/null)" ]; then
  echo "→ Archiving previous output..."
  mkdir -p "$ARCHIVE_DIR"
  cp output/*.md "$ARCHIVE_DIR/" 2>/dev/null || true
  echo "  Archived to $ARCHIVE_DIR"
  echo ""
fi

# Clear current output
rm -f output/*.md
mkdir -p output

echo "→ Starting orchestrator pipeline..."
echo ""

# Run the orchestrator
claude --print "
You are the orchestrator defined in agents/orchestrator.md.

Read that file now to understand your role and pipeline.

The feature spec is located at: $SPEC_FILE

Execute the full pipeline as defined in your persona. Spawn sub-agents
using the Task tool, passing each agent its persona from the agents/ directory
and the relevant context (input files from output/).

The feature name for archiving purposes is: $FEATURE_NAME
"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              Pipeline Complete            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Outputs saved to: output/"
echo "  Archive:          $ARCHIVE_DIR"
echo ""
