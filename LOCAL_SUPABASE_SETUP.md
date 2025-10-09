# Local Supabase Setup Guide - Complete Installation

This guide will help you set up a **fully functional local Supabase instance** for development and testing.

## Prerequisites

### System Requirements
- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: 10GB free space
- **Internet**: Required for initial downloads

---

## Part 1: Install Prerequisites

### Step 1: Install Docker Desktop

Docker is required to run Supabase locally.

#### For Windows:

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop
   - Click "Download for Windows"
   - File size: ~500MB

2. **Install Docker Desktop**
   ```powershell
   # Run the installer you just downloaded
   # Follow the installation wizard
   # Choose "Use WSL 2 instead of Hyper-V" if prompted
   ```

3. **Enable WSL 2 (if not already enabled)**
   ```powershell
   # Open PowerShell as Administrator
   wsl --install
   
   # Restart your computer if prompted
   ```

4. **Start Docker Desktop**
   - Launch Docker Desktop from Start Menu
   - Wait for it to start (Docker icon in system tray will turn green)
   - First start may take 2-5 minutes

5. **Verify Docker Installation**
   ```powershell
   docker --version
   # Should output: Docker version 24.x.x
   
   docker-compose --version
   # Should output: Docker Compose version v2.x.x
   ```

#### For macOS:

```bash
# Option 1: Download from Docker website
# Go to: https://www.docker.com/products/docker-desktop
# Download and install Docker Desktop for Mac

# Option 2: Install via Homebrew
brew install --cask docker

# Start Docker Desktop
open -a Docker

# Verify installation
docker --version
docker-compose --version
```

#### For Linux (Ubuntu/Debian):

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect

# Verify installation
docker --version
docker-compose --version
```

---

### Step 2: Install Supabase CLI

#### For Windows (PowerShell):

```powershell
# Using Scoop package manager (recommended)
# Install Scoop first if you don't have it
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify installation
supabase --version
```

**Alternative: Download Binary Directly**

1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.zip`
3. Extract to a folder (e.g., `C:\supabase`)
4. Add folder to PATH:
   ```powershell
   $env:Path += ";C:\supabase"
   ```

#### For macOS:

```bash
# Using Homebrew
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

#### For Linux:

```bash
# Download and install
curl -fsSL https://github.com/supabase/cli/releases/download/v1.123.4/supabase_1.123.4_linux_amd64.deb -o supabase.deb
sudo dpkg -i supabase.deb

# Or using Homebrew on Linux
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

---

## Part 2: Initialize Local Supabase

### Step 1: Initialize Supabase in Your Project

```powershell
# Navigate to your project directory
cd D:\Staffing-CRM

# Initialize Supabase (if not already done)
supabase init

# This creates/updates the supabase folder with:
# - config.toml
# - .gitignore
# - Docker configuration files
```

### Step 2: Start Local Supabase

```powershell
# Start all Supabase services locally
supabase start

# This will:
# 1. Download Docker images (~2GB first time)
# 2. Start PostgreSQL database
# 3. Start Studio (UI at http://localhost:54323)
# 4. Start Auth service
# 5. Start Storage service
# 6. Start Realtime service
# 7. Start Edge Functions runtime

# First start takes 3-10 minutes
# Subsequent starts take 10-30 seconds
```

### Step 3: Get Local Connection Details

After `supabase start` completes, you'll see output like:

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Save these values!** You'll need them in the next step.

---

## Part 3: Configure Your App for Local Supabase

### Step 1: Create Local Environment File

Create a new file `.env.local` (for local development):

```bash
# Local Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Copy from supabase start output

# Edge Functions URL
VITE_FUNCTIONS_URL=http://localhost:54321/functions/v1

# Supabase Service Role Key (KEEP SECRET)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # Copy from supabase start output

# Database URL (for migrations)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Stripe Configuration (Optional - for testing)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_key

# Resend Email API (Optional - use Inbucket for local testing)
RESEND_API_KEY=re_your_api_key_or_skip_for_local

# Application URL
VITE_APP_URL=http://localhost:5174

# Environment
VITE_ENV=local
```

### Step 2: Update Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:local": "vite --mode local",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:reset": "supabase db reset",
    "db:migrate": "supabase db push",
    "db:seed": "supabase db seed",
    "studio": "start http://localhost:54323"
  }
}
```

---

## Part 4: Apply Migrations to Local Database

### Step 1: Apply All Migrations

```powershell
# Apply all migrations in order
supabase db push

# This runs all SQL files in supabase/migrations/
# in alphabetical order
```

### Step 2: Verify Tables Were Created

```powershell
# Open Supabase Studio in browser
npm run studio
# Or manually: http://localhost:54323

# Navigate to:
# - Table Editor → See all your tables
# - SQL Editor → Run queries
# - Authentication → Manage users
```

### Step 3: Seed Initial Data (Optional)

Create `supabase/seed.sql`:

```sql
-- Insert sample visa statuses
INSERT INTO visa_status (tenant_id, code, label) VALUES
  ('11111111-1111-1111-1111-111111111111', 'H1B', 'H1B'),
  ('11111111-1111-1111-1111-111111111111', 'F1', 'F1'),
  ('11111111-1111-1111-1111-111111111111', 'OPT', 'OPT');

-- Insert sample job titles
INSERT INTO job_titles (tenant_id, category, title) VALUES
  ('11111111-1111-1111-1111-111111111111', 'IT', 'Java Developer'),
  ('11111111-1111-1111-1111-111111111111', 'IT', 'React Developer');

-- Add more seed data as needed...
```

Then run:

```powershell
supabase db seed
```

---

## Part 5: Deploy Edge Functions Locally

### Step 1: Deploy All Functions

```powershell
# Deploy individual functions
supabase functions serve

# This makes all functions available at:
# http://localhost:54321/functions/v1/{function-name}
```

### Step 2: Test Functions

```powershell
# Test a function
curl http://localhost:54321/functions/v1/createTenantAndProfile ^
  -H "Authorization: Bearer YOUR_ANON_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"userId\":\"test\",\"email\":\"test@example.com\"}"
```

---

## Part 6: Start Your Development Environment

### Complete Startup Process

```powershell
# Terminal 1: Start Supabase
supabase start

# Wait for "Started supabase local development setup"

# Terminal 2: Start your app
npm run dev

# Your app is now running at: http://localhost:5174
# Connected to local Supabase at: http://localhost:54321
# Supabase Studio at: http://localhost:54323
```

---

## Useful Commands

### Daily Development

```powershell
# Start everything
supabase start && npm run dev

# Check Supabase status
supabase status

# View logs
supabase logs

# Reset database (careful - deletes all data!)
supabase db reset

# Stop Supabase
supabase stop

# Stop and remove all data
supabase stop --no-backup
```

### Database Operations

```powershell
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# View database diff (before pushing)
supabase db diff

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/database.types.ts
```

### Edge Functions

```powershell
# Create new function
supabase functions new function-name

# Serve functions locally
supabase functions serve

# Deploy to production (later)
supabase functions deploy function-name
```

---

## Troubleshooting

### Docker Not Starting

```powershell
# Check if Docker Desktop is running
Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue

# Restart Docker Desktop
# Close and reopen Docker Desktop app

# Check Docker service (Windows)
Get-Service -Name com.docker.service
```

### Port Already in Use

```powershell
# Check what's using a port
Get-NetTCPConnection -LocalPort 54321

# Kill process using a port
Stop-Process -Id PROCESS_ID
```

### Supabase Won't Start

```powershell
# Stop completely
supabase stop --no-backup

# Clear Docker volumes
docker system prune -a --volumes

# Start fresh
supabase start
```

### Can't Connect to Database

```powershell
# Check if PostgreSQL container is running
docker ps | Select-String postgres

# View PostgreSQL logs
docker logs supabase_db_postgres

# Test direct database connection
psql "postgresql://postgres:postgres@localhost:54322/postgres"
```

---

## Testing Email Functionality

Local Supabase includes **Inbucket** - a local email testing server.

### View Emails

1. Open: http://localhost:54324
2. All emails sent by your app appear here
3. No real emails are sent in local mode
4. Perfect for testing registration, password reset, etc.

---

## Accessing Supabase Studio

### Features Available

- **Table Editor**: View and edit data
- **SQL Editor**: Run custom queries
- **Authentication**: Manage users
- **Storage**: View uploaded files
- **Database**: Schema visualization
- **API Docs**: Auto-generated API documentation

### URL

```
http://localhost:54323
```

---

## Performance Tips

### Speed Up Startup

```powershell
# Use --workdir to specify project location
supabase start --workdir D:\Staffing-CRM

# Keep Docker running in background
# Only stop when you're done for the day
```

### Reduce Resource Usage

Edit `supabase/config.toml`:

```toml
[db]
# Reduce max connections if needed
# default is 100
pooler.max_client_conn = 50
```

---

## Next Steps

After completing this setup:

1. ✅ Local Supabase running
2. ✅ Migrations applied
3. ✅ Edge functions deployed
4. ✅ App connected to local instance

**Now you can:**
- Register users locally
- Test authentication
- Create contacts with real database
- Upload files to local storage
- Send emails (captured in Inbucket)
- Test edge functions
- Debug with full access to data

---

## Switching Between Local and Production

### Use Environment Files

```powershell
# Development (local)
npm run dev

# Production (remote Supabase)
# Create .env.production and use it when deploying
```

### Environment-Specific Config

```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // Config based on mode (local, production, etc.)
}))
```

---

## Backup and Restore

### Backup Local Database

```powershell
# Create backup
docker exec supabase_db_postgres pg_dump -U postgres postgres > backup.sql

# Restore from backup
docker exec -i supabase_db_postgres psql -U postgres postgres < backup.sql
```

---

## Resources

- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Local Development**: https://supabase.com/docs/guides/cli/local-development
- **Docker Desktop**: https://docs.docker.com/desktop/
- **Troubleshooting**: https://supabase.com/docs/guides/cli/troubleshooting

---

**Ready to start?** Follow the steps above in order, and you'll have a fully functional local development environment! 🚀
