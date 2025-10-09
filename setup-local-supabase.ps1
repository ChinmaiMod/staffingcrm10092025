# Quick Setup Script for Local Supabase
# Run this script to check prerequisites and guide you through installation

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Local Supabase Setup Assistant" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
} catch {
    Write-Host "✗ Docker is NOT installed" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop from:" -ForegroundColor Yellow
    Write-Host "  https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    Write-Host ""
    $allGood = $false
}

# Check 2: Docker running
Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
    } else {
        throw "Docker not running"
    }
} catch {
    Write-Host "✗ Docker Desktop is NOT running" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    Write-Host ""
    $allGood = $false
}

# Check 3: Supabase CLI
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = supabase --version 2>$null
    if ($supabaseVersion) {
        Write-Host "✓ Supabase CLI is installed: $supabaseVersion" -ForegroundColor Green
    } else {
        throw "Supabase CLI not found"
    }
} catch {
    Write-Host "✗ Supabase CLI is NOT installed" -ForegroundColor Red
    Write-Host "  Install using Scoop:" -ForegroundColor Yellow
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Cyan
    Write-Host "  scoop install supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Or download from:" -ForegroundColor Yellow
    Write-Host "  https://github.com/supabase/cli/releases" -ForegroundColor Cyan
    Write-Host ""
    $allGood = $false
}

# Check 4: Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node not found"
    }
} catch {
    Write-Host "✗ Node.js is NOT installed" -ForegroundColor Red
    $allGood = $false
}

# Check 5: npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✓ npm is installed: $npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "✗ npm is NOT installed" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "✓ All prerequisites are installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run: supabase start" -ForegroundColor Cyan
    Write-Host "2. Copy the API URL and keys" -ForegroundColor Cyan
    Write-Host "3. Update .env.local file" -ForegroundColor Cyan
    Write-Host "4. Run: npm run dev" -ForegroundColor Cyan
    Write-Host ""
    
    $startNow = Read-Host "Would you like to start Supabase now? (y/n)"
    if ($startNow -eq "y" -or $startNow -eq "Y") {
        Write-Host ""
        Write-Host "Starting Supabase..." -ForegroundColor Yellow
        Write-Host "This may take a few minutes on first run..." -ForegroundColor Gray
        Write-Host ""
        
        supabase start
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Supabase is running!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Important URLs:" -ForegroundColor Yellow
            Write-Host "- Studio (UI):  http://localhost:54323" -ForegroundColor Cyan
            Write-Host "- API:          http://localhost:54321" -ForegroundColor Cyan
            Write-Host "- Email inbox:  http://localhost:54324" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Now update your .env.local file with the keys shown above!" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "✗ Please install missing prerequisites" -ForegroundColor Red
    Write-Host ""
    Write-Host "Quick Installation Guide:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Install Docker Desktop:" -ForegroundColor Cyan
    Write-Host "   https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Install Scoop (package manager):" -ForegroundColor Cyan
    Write-Host "   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Gray
    Write-Host "   irm get.scoop.sh | iex" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Install Supabase CLI:" -ForegroundColor Cyan
    Write-Host "   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor Gray
    Write-Host "   scoop install supabase" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then run this script again!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "For detailed instructions, see: LOCAL_SUPABASE_SETUP.md" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
