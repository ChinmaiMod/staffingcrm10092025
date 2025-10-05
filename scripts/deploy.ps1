param(
  [Parameter(Mandatory=$true)] [string] $SUPABASE_PROJECT_REF,
  [Parameter(Mandatory=$true)] [string] $SERVICE_ROLE_KEY,
  [Parameter(Mandatory=$true)] [string] $SUPABASE_URL,
  [Parameter(Mandatory=$true)] [string] $VERCEL_TOKEN,
  [Parameter(Mandatory=$true)] [string] $VERCEL_PROJECT_ID,
  [string] $RESEND_API_KEY = '',
  [string] $FRONTEND_URL = ''
)

Write-Host "Starting deployment..."

# 1. Run SQL migrations (assumes psql is available and SUPABASE_DATABASE_URL env var created from SERVICE_ROLE_KEY)
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  Write-Error "psql is required for running migrations. Install PostgreSQL client tools."
  exit 1
}

# You need to provide SUPABASE_DATABASE_URL env var that includes the service role connection string.
if (-not $env:SUPABASE_DATABASE_URL) {
  Write-Host "Please set SUPABASE_DATABASE_URL environment variable with the DB connection string (service role). Aborting."
  exit 1
}

# Apply migrations in order (simple sequential apply)
$migrations = @(
  "supabase/migrations/001_initial_schema.sql",
  "supabase/migrations/002_rls_policies.sql",
  "supabase/migrations/005_tenant_invites.sql",
  "supabase/migrations/006_super_admin_policies.sql",
  "supabase/migrations/004_grant_pavan_conditional.sql"
)

foreach ($mig in $migrations) {
  if (Test-Path $mig) {
    Write-Host "Applying migration: $mig"
    psql $env:SUPABASE_DATABASE_URL -f $mig
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Migration $mig failed. Aborting."
      exit 1
    }
  } else {
    Write-Warning "Migration file $mig not found, skipping"
  }
}

# 2. Deploy Supabase functions using supabase CLI
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Error "supabase CLI not found. Install supabase CLI to deploy functions."
  exit 1
}

$functionsDir = "supabase/functions"
Get-ChildItem -Path $functionsDir -Directory | ForEach-Object {
  $fnName = $_.Name
  Write-Host "Deploying function: $fnName"
  supabase functions deploy $fnName --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to deploy function $fnName"
    exit 1
  }
}

# 3. Deploy frontend to Vercel using vercel CLI
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Warning "Vercel CLI not found. Skipping frontend deploy. You can deploy manually via Vercel dashboard."
} else {
  Write-Host "Deploying frontend to Vercel"
  # Set envs for vercel; here we set VITE variables temporarily for deployment
  vercel env add VITE_SUPABASE_URL $SUPABASE_URL --project $VERCEL_PROJECT_ID || Write-Host "Could not set env VITE_SUPABASE_URL"
  # For simplicity, we assume other envs are configured in Vercel dashboard
  vercel --token $VERCEL_TOKEN --prod
}

Write-Host "Deployment finished."
