# Supabase Setup Guide for VS Code Extension

## Step 1: Install Supabase CLI (if not already done)

Open PowerShell and run:
```powershell
npm install -g supabase
```

Or using Scoop:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Verify installation:
```powershell
supabase --version
```

## Step 2: Login to Supabase

In VS Code terminal:
```powershell
supabase login
```

This will open a browser to authenticate. Follow the prompts to generate an access token.

## Step 3: Link to Your Supabase Project

### Option A: Link to Existing Project
```powershell
supabase link --project-ref your-project-ref
```

To find your project ref:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > General
4. Copy the "Reference ID"

### Option B: Create New Project from Dashboard
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: "Staffing CRM"
   - Database Password: (choose a strong password - save this!)
   - Region: (choose closest to your users)
4. Wait for project to be created (~2 minutes)
5. Copy the project reference ID
6. Run: `supabase link --project-ref your-project-ref`

## Step 4: Get Your Supabase Credentials

After linking, you can view your project details:
```powershell
supabase status
```

To get your API keys:
1. Go to your Supabase Dashboard
2. Click on Settings > API
3. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Starts with `eyJhbG...`
   - **service_role key**: Starts with `eyJhbG...` (keep this secret!)

## Step 5: Create .env File

Create a `.env` file in the project root with your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe Configuration (get from https://dashboard.stripe.com)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Service Role (from Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL
VITE_APP_URL=http://localhost:5173
```

## Step 6: Apply Database Migrations

Run the migrations to create all tables and RLS policies:

```powershell
supabase db push
```

This will execute:
- `supabase/migrations/001_initial_schema.sql` - Creates all tables
- `supabase/migrations/002_rls_policies.sql` - Sets up security policies

## Step 7: Deploy Edge Functions

Deploy all Edge Functions one by one:

```powershell
supabase functions deploy createTenantAndProfile
supabase functions deploy createCheckoutSession  
supabase functions deploy stripeWebhook
supabase functions deploy resendVerification
supabase functions deploy verifyToken
supabase functions deploy getPostLoginRoute
```

## Step 8: Set Edge Function Secrets

Configure secrets for your Edge Functions:

```powershell
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Step 9: Verify Database Setup

You can check your tables in multiple ways:

### Using VS Code Supabase Extension:
1. Click on Supabase icon in sidebar
2. Browse your tables under "Database"
3. Run queries in the SQL editor

### Using Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Table Editor"
4. You should see: tenants, profiles, subscriptions, payments, promo_codes, email_tokens, audit_logs

### Using CLI:
```powershell
supabase db diff
```

## Step 10: Configure Email Settings

1. Go to Authentication > Email Templates in Supabase Dashboard
2. Customize the "Confirm signup" email template
3. Update the redirect URL to: `{{ .ConfirmationURL }}`

## Step 11: Start Local Development (Optional)

To develop locally with Supabase:

```powershell
# Start local Supabase
supabase start

# This will start:
# - PostgreSQL database
# - Studio UI (http://localhost:54323)
# - API Gateway
# - Auth server
# - Storage server
```

## Step 12: Install Dependencies and Run App

```powershell
# Install npm packages
npm install

# Start development server
npm run dev
```

## Troubleshooting

### Error: "Cannot find project ref"
- Make sure you've linked to a project: `supabase link --project-ref your-ref`

### Error: "Permission denied" when pushing migrations
- Verify you're logged in: `supabase login`
- Check your access token is valid

### Error: Edge Functions not deploying
- Ensure you have Deno installed (functions use Deno runtime)
- Check function syntax in `supabase/functions/*/index.ts`

### Email verification not working
- Check email templates in Supabase Dashboard
- Verify site URL is set to `http://localhost:5173` in Auth settings
- Check spam/junk folder

## Quick Command Reference

```powershell
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy a function
supabase functions deploy function-name

# Set a secret
supabase secrets set SECRET_NAME=value

# Start local development
supabase start

# Stop local development
supabase stop

# View logs
supabase functions logs function-name

# Check status
supabase status
```

## Next Steps After Setup

1. Test user registration at http://localhost:5173/register
2. Check email verification flow
3. Test subscription purchase with Stripe test cards
4. Monitor Edge Function logs for any errors
5. Configure Stripe webhook in production

---

For more help, see:
- Supabase Docs: https://supabase.com/docs
- Supabase CLI Docs: https://supabase.com/docs/reference/cli
