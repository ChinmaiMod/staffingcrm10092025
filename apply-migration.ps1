# Supabase Migration Runner
Write-Host "========================================"
Write-Host "Supabase CRM Migration Runner"
Write-Host "========================================"
Write-Host ""

# Read the migration SQL file
Write-Host "Reading migration file..." -ForegroundColor Yellow
$sqlContent = Get-Content -Path ".\supabase\migrations\007_crm_contacts_schema.sql" -Raw

if (-not $sqlContent) {
    Write-Host "ERROR: Could not read migration file" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file loaded successfully" -ForegroundColor Green
Write-Host "SQL Length: $($sqlContent.Length) characters"
Write-Host ""

# Copy SQL to clipboard
$sqlContent | Set-Clipboard
Write-Host "SUCCESS: SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Opening Supabase SQL Editor in your browser..."
Write-Host "2. Paste the SQL (Ctrl+V or right-click > Paste)"
Write-Host "3. Click the RUN button (or press Ctrl+Enter)"
Write-Host ""
Write-Host "Press any key to open browser..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Open Supabase SQL Editor
Start-Process "https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/sql/new"

Write-Host ""
Write-Host "Browser opened! Paste and run the SQL now." -ForegroundColor Green
