# run-coach.ps1  -  Invoke Zapp (Coach) to evaluate team performance
# Usage: ./scripts/run-coach.ps1 [-Notes "your observations"]

param(
    [string]$Notes = ""
)

$ArchiveDir = "output/archive"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Agent Team: Coach Evaluation           " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check for archived outputs
if (-not (Test-Path $ArchiveDir) -or -not (Get-ChildItem $ArchiveDir -ErrorAction SilentlyContinue)) {
    Write-Host "  No archived feature outputs found in $ArchiveDir" -ForegroundColor Yellow
    Write-Host "  Zapp needs historical data to evaluate. Run some features first."
    Write-Host ""
    exit 1
}

$FeatureCount = (Get-ChildItem $ArchiveDir -Directory).Count
Write-Host "  Archived features found: $FeatureCount"

if ($Notes) {
    Write-Host "  Human observations: provided"
}

Write-Host ""

$ArchiveContext = @"
The archived feature outputs are in: $ArchiveDir

Each subdirectory represents one completed feature cycle and contains the
output files from every agent that ran (spec.md, research.md, implementation-summary.md,
test-summary.md, review-summary.md, documentation-summary.md, and debug-report.md if applicable).

Read all of these files to understand how the team has been performing.
"@

$HumanContext = ""
if ($Notes) {
    $HumanContext = @"
## Human Observations

The developer has provided the following direct observations about team performance.
Weight these heavily  -  they have context the output files don't capture:

$Notes
"@
}

$Prompt = @"
You are the Coach defined in agents/coach.md.

Read that file now to understand your role and evaluation process.

$ArchiveContext

$HumanContext

Evaluate the team's performance across all archived cycles. Follow your evaluation
process: inventory patterns, distinguish signal from noise, trace issues to their
source, and propose specific persona changes where patterns are confirmed.

Write your full report to output/coach-report.md
"@

Write-Host "-> Invoking Zapp (Coach)..." -ForegroundColor Green
Write-Host ""

$Prompt | claude --print

# Archive the coach report
$CoachArchive = "$ArchiveDir/coach_reports"
New-Item -ItemType Directory -Path $CoachArchive -Force | Out-Null
Copy-Item "output/coach-report.md" "$CoachArchive/coach-report_${Timestamp}.md" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Coach Evaluation Complete              " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Report saved to:  output/coach-report.md"
Write-Host "  Archive copy:     $CoachArchive/coach-report_${Timestamp}.md"
Write-Host ""
Write-Host "  Review the recommendations and apply approved"
Write-Host "  persona changes to the agents/ directory."
Write-Host ""
