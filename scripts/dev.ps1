<#
dev.ps1 - Helper to run the Staffing-CRM frontend locally and guidance to run Supabase functions

Usage:
  # Set your Supabase env vars for the local frontend (one-time per session)
  $env:VITE_SUPABASE_URL = 'https://your-project.supabase.co'
  $env:VITE_SUPABASE_ANON_KEY = 'public-anon-key'
  $env:VITE_FUNCTIONS_URL = 'http://localhost:54321/functions/v1'  # if running functions locally

  # Then run the script
  .\scripts\dev.ps1

Notes:
 - This script starts the Vite dev server. It does not automatically start Supabase local stack or functions.
 - To serve functions locally, open another PowerShell and run:
     supabase start          # (optional) starts local Supabase (requires Docker)
     supabase functions serve --env-file .env.local

 - If you prefer using a remote Supabase project, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your project's values.

Requirements:
 - Node.js and npm installed
 - (Optional) Supabase CLI installed and authenticated if you want to run functions locally

#>

Write-Output "Starting dev helper..."

function Ensure-Command([string]$cmd) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $found) {
    Write-Warning "$cmd not found on PATH. Install it before running the full stack."
  }
}

Ensure-Command node
Ensure-Command npm
Ensure-Command psql

$root = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location $root\..\

if (-not (Test-Path node_modules)) {
  Write-Output "Installing npm dependencies (this may take a moment)..."
  npm ci
}

Write-Output "Starting Vite dev server..."
Write-Output "If you need Supabase functions locally, open a separate terminal and run: supabase functions serve"

# Start the dev server (blocking). Use -NoBrowser to avoid auto-opening, or remove if you want browser opened.
npm run dev
