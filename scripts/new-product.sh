#!/bin/bash

# new-product.sh — Start a product spec conversation
# Usage: ./scripts/new-product.sh "your idea or description"
#        ./scripts/new-product.sh  (will prompt you for the idea)
#
# This launches an interactive conversation with the Product Spec Agent.
# It will ask you questions, do research, and produce a full product spec
# plus feature specs ready for the build pipeline.

set -e

IDEA=$1

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       Agent Team: Product Spec Session        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# If no idea provided, prompt for it
if [ -z "$IDEA" ]; then
  echo "  Describe your product idea. Be as rough or detailed as you like."
  echo "  The agent will ask follow-up questions to fill in the gaps."
  echo ""
  echo -n "  Your idea: "
  read -r IDEA
  echo ""
fi

if [ -z "$IDEA" ]; then
  echo "  No idea provided. Exiting."
  exit 1
fi

echo "  Idea: $IDEA"
echo ""
echo "  The Product Spec Agent will research your idea, share its initial"
echo "  read, and ask you questions to complete the spec."
echo ""
echo "  This is a conversation — answer its questions and it will continue"
echo "  until a full spec is ready."
echo ""

# Create specs directory if it doesn't exist
mkdir -p specs

echo "→ Starting Product Spec Agent..."
echo ""

claude "
You are the Product Spec Agent defined in agents/product-spec-agent.md.

Read that file now to understand your role, process, and output format.

The developer's idea is:

\"\"\"
$IDEA
\"\"\"

Begin Stage 1: research the space before asking any questions.
Then proceed to Stage 2: share your initial read and your first round
of questions.

Remember: this is a conversation. Ask your first round of questions and
wait for the developer's responses before proceeding. Do not produce
the full spec until you have completed enough rounds to answer YES
to all the completion criteria in your persona.

Output all spec files to the specs/ directory as described in your persona.
"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║          Product Spec Session Complete        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Spec files written to: specs/"
echo ""
echo "  To start building:"
echo "  ./scripts/build-feature.sh specs/[product-name]/features/[first-feature].md"
echo ""
