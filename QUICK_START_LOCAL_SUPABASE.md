# 🚀 Quick Start - Local Supabase Setup

**Get your entire app running locally in 30 minutes!**

## Step-by-Step Installation

### Step 1: Install Docker Desktop (10 min)

1. **Download Docker Desktop**
   ```
   https://www.docker.com/products/docker-desktop
   ```

2. **Run the installer**
   - Follow the wizard
   - Choose "Use WSL 2" if prompted
   - **Restart your computer** after installation

3. **Start Docker Desktop**
   - Launch from Start Menu
   - Wait for green "Docker Desktop is running" indicator
   - This may take 2-5 minutes

4. **Verify Docker**
   ```powershell
   docker --version
   # Should show: Docker version 24.x.x
   ```

---

### Step 2: Install Supabase CLI (5 min)

**Option A: Using Scoop (Recommended)**

```powershell
# Install Scoop package manager
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify installation
supabase --version
```

**Option B: Manual Download**

1. Go to: https://github.com/supabase/cli/releases
2. Download `supabase_windows_amd64.zip`
3. Extract to `C:\supabase`
4. Add to PATH

---

### Step 3: Run Setup Script (2 min)

```powershell
# Navigate to your project
cd D:\Staffing-CRM

# Run the setup assistant
npm run setup
```

This will:
- ✓ Check all prerequisites
- ✓ Guide you through any missing installations
- ✓ Optionally start Supabase for you

---

### Step 4: Start Supabase (5 min first time, 30 sec after)

```powershell
# Start all Supabase services
npm run supabase:start

# Or directly:
supabase start
```

**First time**: Downloads ~2GB of Docker images (5-10 min)
**Subsequent times**: Starts in 10-30 seconds

You'll see output like:
```
Started supabase local development setup.

         API URL: http://localhost:54321
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Step 5: Configure Environment (2 min)

1. **Copy the template**
   ```powershell
   Copy-Item .env.local.template .env.local
   ```

2. **Edit `.env.local`**
   - Open in VS Code
   - Replace `paste_anon_key_from_supabase_start_output` with the actual anon key
   - Replace `paste_service_role_key_from_supabase_start_output` with the actual service role key
   - Save the file

Example:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

---

### Step 6: Apply Database Migrations (1 min)

```powershell
# Apply all migrations to create tables
npm run db:migrate

# Or directly:
supabase db push
```

This creates all your database tables, RLS policies, and functions.

---

### Step 7: Start Your App (1 min)

```powershell
# Start the development server
npm run dev
```

**Your app is now running!**
- App: http://localhost:5174
- Supabase Studio: http://localhost:54323
- Email Inbox: http://localhost:54324

---

## Daily Workflow

### Starting Your Day

```powershell
# Terminal 1: Start Supabase (if not already running)
npm run supabase:start

# Terminal 2: Start your app
npm run dev
```

### Ending Your Day

```powershell
# Stop Supabase (optional - can leave running)
npm run supabase:stop

# Or just close terminals
```

---

## Useful Commands

### Supabase Management

```powershell
# Check status
npm run supabase:status

# View Studio (database UI)
npm run studio

# Reset database (deletes all data!)
npm run db:reset

# Restart Supabase
npm run supabase:restart

# Stop Supabase
npm run supabase:stop
```

### Database Operations

```powershell
# Apply migrations
npm run db:migrate

# Reset to clean state
npm run db:reset

# Create new migration
supabase migration new my_migration_name
```

---

## Accessing Key Services

### Supabase Studio (Database UI)
```
http://localhost:54323
```
- View/edit data
- Run SQL queries
- Manage users
- Upload files
- View API docs

### Email Testing (Inbucket)
```
http://localhost:54324
```
- View all sent emails
- Test registration emails
- Test password reset
- No real emails sent!

### API Endpoint
```
http://localhost:54321
```
- Your API base URL
- Use in frontend code
- Edge functions available at /functions/v1/

---

## Testing the Setup

### 1. Open Studio
```powershell
npm run studio
```

Go to http://localhost:54323

### 2. Check Tables
- Click "Table Editor"
- You should see:
  - tenants
  - profiles
  - contacts
  - visa_status
  - job_titles
  - etc.

### 3. Test Your App
1. Go to http://localhost:5174
2. Click "Register"
3. Create an account
4. Check http://localhost:54324 for verification email
5. Login
6. Access CRM
7. Create a contact - it saves to real database!

---

## Troubleshooting

### Docker Not Running

**Error:** `Cannot connect to the Docker daemon`

**Fix:**
```powershell
# Start Docker Desktop
# Wait for it to fully start (green icon in system tray)
```

### Port Already in Use

**Error:** `Port 54321 already allocated`

**Fix:**
```powershell
# Stop Supabase
npm run supabase:stop

# Check what's using the port
Get-NetTCPConnection -LocalPort 54321

# Kill the process
Stop-Process -Id PROCESS_ID

# Try again
npm run supabase:start
```

### Supabase Start Fails

**Error:** Various startup errors

**Fix:**
```powershell
# Complete reset
supabase stop --no-backup
docker system prune -a --volumes

# Start fresh
supabase start
```

### Missing Tables

**Error:** Tables don't exist

**Fix:**
```powershell
# Apply migrations
npm run db:migrate

# Or reset database
npm run db:reset
```

---

## What You Get

✅ **PostgreSQL Database**
- Full Postgres 15 database
- All your tables and relationships
- RLS (Row Level Security) enabled

✅ **Authentication**
- User registration/login
- Email verification
- Password reset
- Session management

✅ **Storage**
- File uploads
- Attachment management
- Public/private buckets

✅ **Realtime**
- Live database changes
- Websocket connections
- Subscribe to data changes

✅ **Edge Functions**
- Serverless functions
- API endpoints
- Background jobs

✅ **Email Testing**
- Inbucket email server
- View all sent emails
- No real emails sent

✅ **Studio (UI)**
- Database browser
- SQL editor
- User management
- API documentation

---

## Next Steps

After setup is complete:

1. ✅ **Test Registration**
   - Register a new user
   - Check email in Inbucket
   - Verify account

2. ✅ **Create CRM Data**
   - Add contacts
   - Upload attachments
   - Send bulk emails

3. ✅ **Explore Studio**
   - View data in tables
   - Run SQL queries
   - Check RLS policies

4. ✅ **Test Edge Functions**
   - Create tenant
   - Send emails
   - Upload files

---

## Resources

- **Full Setup Guide**: `LOCAL_SUPABASE_SETUP.md`
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Docker Desktop**: https://docs.docker.com/desktop/
- **Troubleshooting**: Ask me or check Supabase Discord

---

## Support

If you get stuck:

1. Run the setup script: `npm run setup`
2. Check Docker is running
3. Read the error messages
4. Check `LOCAL_SUPABASE_SETUP.md`
5. Ask me for help!

---

**Total Time**: ~30 minutes for first-time setup
**Daily Startup**: ~1 minute

🎉 **You're ready to build!**
