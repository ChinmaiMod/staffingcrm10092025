<#
inspect_db.ps1

Usage:
  # set env variable for the session
  $env:SUPABASE_DATABASE_URL = 'postgres://user:pass@host:5432/dbname'
  .\scripts\inspect_db.ps1

Or pass connection string as first arg:
  .\scripts\inspect_db.ps1 'postgres://user:pass@host:5432/dbname'

This script runs a set of psql queries to list tables, columns for key tables,
check for CRM-related tables, and dumps FK relationships referencing profiles/tenants.
It writes output to `scripts/db_inspect_output.txt` in the workspace.

Requirements: psql (and optionally pg_dump) must be on PATH.
#>

param(
  [string]$DatabaseUrl = $env:SUPABASE_DATABASE_URL
)

if (-not $DatabaseUrl) {
  Write-Error "Database URL not provided. Set SUPABASE_DATABASE_URL env var or pass as first argument."
  exit 1
}

$outFile = Join-Path -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent) -ChildPath 'db_inspect_output.txt'
Remove-Item -Path $outFile -ErrorAction SilentlyContinue

function Run-PSQL($sql, $desc) {
  Add-Content -Path $outFile -Value "`n== $desc ==`n"
  & psql $DatabaseUrl -v ON_ERROR_STOP=1 -c $sql 2>&1 | ForEach-Object { Add-Content -Path $outFile -Value $_ }
}

Write-Output "Inspecting database and writing results to $outFile"

Run-PSQL "SELECT current_database(), current_user;" "Connection Info"

Run-PSQL "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" "Public Tables"

Run-PSQL "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;" "Profiles Columns"

Run-PSQL "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' ORDER BY ordinal_position;" "Tenants Columns"

Run-PSQL "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='tenant_invites' ORDER BY ordinal_position;" "Tenant Invites Columns"

# Check for CRM tables existence
$crmTables = @('contacts','contact_attachments','contact_comments','email_templates','notification_configs','job_titles','visa_status')
Add-Content -Path $outFile -Value "`n== CRM Tables Existence ==`n"
foreach ($t in $crmTables) {
  $res = & psql $DatabaseUrl -t -c "SELECT to_regclass('public.$t');" 2>&1
  Add-Content -Path $outFile -Value "$t : $res"
}

# Foreign keys referencing profiles
Run-PSQL @"
SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'profiles' ORDER BY tc.table_name;
"@ "Foreign keys referencing profiles"

# Foreign keys referencing tenants
Run-PSQL @"
SELECT tc.table_schema, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'tenants' ORDER BY tc.table_name;
"@ "Foreign keys referencing tenants"

Write-Output "Inspection complete. Output saved to $outFile"

if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
  $dumpFile = Join-Path -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent) -ChildPath ("supabase_backup_$(Get-Date -Format yyyyMMdd_HHmmss).sql")
  Write-Output "pg_dump found. To take a full logical backup run: pg_dump $DatabaseUrl -Fc -f $dumpFile"
} else {
  Write-Output "pg_dump not found on PATH. Install Postgres client tools to perform a dump."
}
