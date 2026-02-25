# codebase-review.ps1  -  Run a full codebase audit and remediation sweep
# Usage: ./scripts/codebase-review.ps1 [-AuditOnly]
#
# -AuditOnly   Run the audit and produce the backlog, but stop before
#              spawning implementers. Useful for reviewing the backlog
#              before committing to changes.

param(
    [switch]$AuditOnly
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReviewDir = "output/codebase-review"
$ArchiveDir = "output/archive/codebase-review-${Timestamp}"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     Agent Team: Full Codebase Review       " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($AuditOnly) {
    Write-Host "  Mode: AUDIT ONLY (backlog will be produced, no changes made)" -ForegroundColor Yellow
} else {
    Write-Host "  Mode: FULL (audit + remediation)" -ForegroundColor Green
}
Write-Host ""

# Check for uncommitted changes
$GitStatus = git status --porcelain 2>$null
if ($GitStatus) {
    Write-Host "  Warning: You have uncommitted changes." -ForegroundColor Yellow
    Write-Host "  It's strongly recommended to commit or stash before running a full review."
    Write-Host ""
    $Confirm = Read-Host "  Continue anyway? (y/N)"
    if ($Confirm -notmatch '^[Yy]$') {
        Write-Host "  Aborted. Commit your changes and re-run." -ForegroundColor Red
        exit 1
    }
}

# Create fresh review output directory
if (Test-Path $ReviewDir) {
    Remove-Item $ReviewDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ReviewDir -Force | Out-Null

Write-Host "-> Invoking Mom (Full Codebase Reviewer)..." -ForegroundColor Green
Write-Host ""

if ($AuditOnly) {
    $ModeInstruction = "Run Phase 1 (Codebase Mapping), Phase 2 (Parallel Audit Swarm), and Phase 3 (Backlog Synthesis) only. DO NOT proceed to Phase 4 (Implementation). End after writing the backlog to output/codebase-review/backlog.md and present it to the human for review."
} else {
    $ModeInstruction = "Run all phases: Codebase Mapping, Parallel Audit Swarm, Backlog Synthesis, Parallel Implementation Swarm, Verification Pass, and Final Report."
}

$Prompt = @"
You are the Full Codebase Reviewer defined in agents/codebase-reviewer.md.

Read that file now to understand your role and the full multi-phase process.

The project root is the current directory. Begin by surveying the codebase
structure before spawning any sub-agents.

Write all review output to: output/codebase-review/

$ModeInstruction
"@

$Prompt | claude --print

# Archive the review output
New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
Get-ChildItem -Path $ReviewDir -Recurse | Copy-Item -Destination $ArchiveDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "     Codebase Review Complete               " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Review output:  $ReviewDir"
Write-Host "  Archive:        $ArchiveDir"
Write-Host ""

if ($AuditOnly) {
    Write-Host "  Audit-only mode  -  no changes were made." -ForegroundColor Yellow
    Write-Host "  Review output/codebase-review/backlog.md"
    Write-Host "  then run without -AuditOnly to apply fixes."
}
Write-Host ""
