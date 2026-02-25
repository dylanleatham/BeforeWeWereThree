# debug.ps1  -  Invoke Zoidberg (Debugging Agent) with error context
# Usage: ./scripts/debug.ps1 -Bug "description of the bug" [-Log path/to/error.log]

param(
    [Parameter(Mandatory=$true)]
    [string]$Bug,

    [string]$Log = ""
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Agent Team: Debug Session              " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Bug: $Bug"

$LogContext = ""
if ($Log -and (Test-Path $Log)) {
    Write-Host "  Log: $Log"
    $LogContext = "The error log is located at: $Log  -  read it carefully."
}

Write-Host ""

New-Item -ItemType Directory -Path "output" -Force | Out-Null

$Prompt = @"
You are the Debugging Agent defined in agents/debugging-agent.md.

Read that file now to understand your role and process.

## Bug Report

**Description:** $Bug

$LogContext

Follow your debugging process systematically:
1. Understand the symptom
2. Form hypotheses
3. Investigate the codebase and logs
4. Identify the root cause
5. Implement a fix or produce a precise fix plan

Write your full report to output/debug-report.md
"@

Write-Host "-> Invoking Zoidberg (Debugging Agent)..." -ForegroundColor Green
Write-Host ""

$Prompt | claude --print

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Debug Session Complete                 " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Report saved to: output/debug-report.md"
Write-Host ""
