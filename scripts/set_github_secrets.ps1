<#
set_github_secrets.ps1

Usage:
  # Interactive: you will be prompted for each secret (leave blank to skip)
  .\scripts\set_github_secrets.ps1 -Repo 'ChinmaiMod/staffingcrm'

  # From environment variables (recommended for automation):
  $env:SUPABASE_DATABASE_URL = 'postgres://...'
  $env:SUPABASE_ACCESS_TOKEN = '...'
  .\scripts\set_github_secrets.ps1 -Repo 'ChinmaiMod/staffingcrm'

Requirements:
  - GitHub CLI (gh) must be installed and authenticated: `gh auth login`

This script will set a list of repository secrets using `gh secret set`.
#>

param(
  [Parameter(Mandatory=$true)] [string]$Repo,
  [switch]$DryRun
)

function Test-GhCli {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install GitHub CLI and run 'gh auth login' first."
    exit 1
  }
}

Test-GhCli

$secrets = @(
  'SUPABASE_DATABASE_URL',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FUNCTIONS_URL',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VERCEL_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID',
  'RESEND_API_KEY',
  'INVITE_FROM',
  'SENDGRID_API_KEY'
)

Write-Output "Setting GitHub Actions secrets for repo: $Repo"

foreach ($name in $secrets) {
  $value = ${env:$name}
  if (-not $value) {
    $userVal = Read-Host -Prompt "Enter value for $name (leave blank to skip)"
    if ([string]::IsNullOrWhiteSpace($input)) {
      Write-Output "Skipping $name"
      continue
    }
    $value = $userVal
  }

  if ($DryRun) {
    Write-Output "[DRY RUN] gh secret set $name --repo $Repo"
  } else {
    Write-Output "Setting secret: $name"
    gh secret set $name --body "$value" --repo $Repo
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Failed to set $name"
    }
  }
}

Write-Output "Done. Verify secrets in https://github.com/$Repo/settings/secrets/actions"
