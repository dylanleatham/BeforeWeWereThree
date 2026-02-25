# build-feature.ps1  -  Run the full agent team pipeline for a feature
# Usage: ./scripts/build-feature.ps1 specs/your-feature.md

param(
    [Parameter(Mandatory=$true)]
    [string]$SpecFile
)

if (-not (Test-Path $SpecFile)) {
    Write-Host "Error: spec file not found: $SpecFile" -ForegroundColor Red
    exit 1
}

# Extract feature name from spec file (filename without extension)
$FeatureName = [System.IO.Path]::GetFileNameWithoutExtension($SpecFile)
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveDir = "output/archive/${FeatureName}_${Timestamp}"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Agent Team: Build Feature              " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Feature: $FeatureName"
Write-Host "  Spec:    $SpecFile"
Write-Host ""

# Archive previous output if it exists
$ExistingOutputs = Get-ChildItem -Path "output" -Filter "*.md" -ErrorAction SilentlyContinue
if ($ExistingOutputs) {
    Write-Host "-> Archiving previous output..."
    New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
    Get-ChildItem -Path "output" -Filter "*.md" | Copy-Item -Destination $ArchiveDir -ErrorAction SilentlyContinue
    Write-Host "   Archived to $ArchiveDir"
    Write-Host ""
}

# Clear current output
Get-ChildItem -Path "output" -Filter "*.md" -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "output" -Force | Out-Null

Write-Host "-> Starting Leela (Orchestrator)..." -ForegroundColor Green
Write-Host ""

$Prompt = @"
You are the orchestrator defined in agents/orchestrator.md.

Read that file now to understand your role and pipeline.

The feature spec is located at: $SpecFile

Execute the full pipeline as defined in your persona. Spawn sub-agents
using the Task tool, passing each agent its persona from the agents/ directory
and the relevant context (input files from output/).

The feature name for archiving purposes is: $FeatureName
"@

$Prompt | claude --print

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     Pipeline Complete                      " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Outputs saved to: output/"
Write-Host "  Archive:          $ArchiveDir"
Write-Host ""
