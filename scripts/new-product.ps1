# new-product.ps1  -  Start a product spec conversation with Calculon
# Usage: ./scripts/new-product.ps1 "your idea or description"
#        ./scripts/new-product.ps1   (will prompt you for the idea)
#
# This launches an interactive conversation with the Product Spec Agent.
# It will ask you questions, do research, and produce a full product spec
# plus feature specs ready for the build pipeline.

param(
    [string]$Idea = ""
)

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     Agent Team: Product Spec Session       " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# If no idea provided, prompt for it
if (-not $Idea) {
    Write-Host "  Describe your product idea. Be as rough or detailed as you like."
    Write-Host "  Calculon will ask follow-up questions to fill in the gaps."
    Write-Host ""
    $Idea = Read-Host "  Your idea"
    Write-Host ""
}

if (-not $Idea) {
    Write-Host "  No idea provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "  Idea: $Idea"
Write-Host ""
Write-Host "  Calculon will research your idea, share its initial read,"
Write-Host "  and ask you questions to complete the spec."
Write-Host ""
Write-Host "  This is a conversation  -  answer its questions and it will continue"
Write-Host "  until a full spec is ready."
Write-Host ""

# Create specs directory if it doesn't exist
New-Item -ItemType Directory -Path "specs" -Force | Out-Null

Write-Host "-> Starting Calculon (Product Spec Agent)..." -ForegroundColor Green
Write-Host ""

$Prompt = @"
You are the Product Spec Agent defined in agents/product-spec-agent.md.

Read that file now to understand your role, process, and output format.

The developer's idea is:

---
$Idea
---

Begin Stage 1: research the space before asking any questions.
Then proceed to Stage 2: share your initial read and your first round
of questions.

Remember: this is a conversation. Ask your first round of questions and
wait for the developer's responses before proceeding. Do not produce
the full spec until you have completed enough rounds to answer YES
to all the completion criteria in your persona.

Output all spec files to the specs/ directory as described in your persona.
"@

$Prompt | claude

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     Product Spec Session Complete          " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Spec files written to: specs/"
Write-Host ""
Write-Host "  To start building:"
Write-Host "  ./scripts/build-feature.ps1 specs/[product-name]/features/[first-feature].md"
Write-Host ""
