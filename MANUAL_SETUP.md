# Manual Supabase Setup Guide (Dashboard Method)

Since the CLI is having issues with OneDrive sync, we'll set everything up through the Supabase Dashboard. This is actually easier and more visual!

## Step 1: Apply Database Migrations

### 1.1 Go to SQL Editor
1. Open https://supabase.com/dashboard
2. Select your project: **yvcsxadahzrxuptcgtkg**
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2 Run Migration 001 (Initial Schema)
Copy and paste the entire contents of this file:
`supabase/migrations/001_initial_schema.sql`

Click **RUN** or press `Ctrl+Enter`

You should see: ✅ **Success. No rows returned**

This creates:
- ✅ 7 tables (tenants, profiles, subscriptions, payments, promo_codes, email_tokens, audit_logs)
- ✅ All indexes for performance
- ✅ Triggers for automatic timestamp updates

### 1.3 Run Migration 002 (RLS Policies)
1. Click **New Query** again
2. Copy and paste the entire contents of this file:
   `supabase/migrations/002_rls_policies.sql`
3. Click **RUN**

You should see: ✅ **Success. No rows returned**

This sets up:
- ✅ Row Level Security on all tables
- ✅ Tenant isolation policies
- ✅ Helper functions for RLS

### 1.4 Verify Tables Created
1. Click **Table Editor** in left sidebar
2. You should see all 7 tables:
   - tenants
   - profiles
   - subscriptions
   - payments
   - promo_codes
   - email_tokens
   - audit_logs

---

## Step 2: Get Your API Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these values (you'll need them soon):

```
Project URL: https://yvcsxadahzrxuptcgtkg.supabase.co
anon public key: eyJhbG... (copy the full key)
service_role key: eyJhbG... (copy the full key - KEEP SECRET!)
```

---

## Step 3: Create .env File

Create a file called `.env` in your project root:

**Windows Method:**
1. In VS Code, right-click in the file explorer
2. Click "New File"
3. Name it: `.env`
4. Paste this content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://yvcsxadahzrxuptcgtkg.supabase.co
VITE_SUPABASE_ANON_KEY=paste_your_anon_key_here

# Stripe Configuration (we'll add these later)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Supabase Service Role (paste the service_role key)
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here

# Application URL
VITE_APP_URL=http://localhost:5173
```

---

## Step 4: Deploy Edge Functions (Manual Method)

Since CLI isn't working, we'll deploy Edge Functions through the dashboard:

### 4.1 Create Each Edge Function

Go to **Edge Functions** in your Supabase dashboard, then for each function:

#### Function 1: createTenantAndProfile
1. Click **Create a new function**
2. Name: `createTenantAndProfile`
3. Copy the code from: `supabase/functions/createTenantAndProfile/index.ts`
4. Click **Deploy**

#### Function 2: createCheckoutSession
1. Click **Create a new function**
2. Name: `createCheckoutSession`
3. Copy the code from: `supabase/functions/createCheckoutSession/index.ts`
4. Click **Deploy**

#### Function 3: stripeWebhook
1. Click **Create a new function**
2. Name: `stripeWebhook`
3. Copy the code from: `supabase/functions/stripeWebhook/index.ts`
4. Click **Deploy**

#### Function 4: resendVerification
1. Click **Create a new function**
2. Name: `resendVerification`
3. Copy the code from: `supabase/functions/resendVerification/index.ts`
4. Click **Deploy**

#### Function 5: verifyToken
1. Click **Create a new function**
2. Name: `verifyToken`
3. Copy the code from: `supabase/functions/verifyToken/index.ts`
4. Click **Deploy**

#### Function 6: getPostLoginRoute
1. Click **Create a new function**
2. Name: `getPostLoginRoute`
3. Copy the code from: `supabase/functions/getPostLoginRoute/index.ts`
4. Click **Deploy**

### 4.2 Set Edge Function Secrets

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add these secrets:

```
STRIPE_SECRET_KEY = sk_test_your_stripe_secret_key
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key_from_step_2
STRIPE_WEBHOOK_SECRET = whsec_your_webhook_secret (get this from Stripe later)
```

---

## Step 5: Configure Authentication Settings

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:5173`
3. Add to **Redirect URLs**:
   - `http://localhost:5173/**`
   - `http://localhost:5173/verify`
   - `http://localhost:5173/reset-password`

4. Go to **Authentication** → **Email Templates**
5. Edit **Confirm signup** template
6. Make sure it includes: `{{ .ConfirmationURL }}`

---

## Step 6: Set Up Stripe (Optional for now)

You can do this later when you want to test payments:

1. Go to https://dashboard.stripe.com
2. Create test products:
   - **CRM Plan**: $49/month, $470/year
   - **SUITE Plan**: $149/month, $1490/year
3. Copy the Price IDs and update them in `src/components/Billing/Plans.jsx`

---

## Step 7: Install Dependencies and Run

```powershell
# Install packages
npm install

# Start the development server
npm run dev
```

Open http://localhost:5173

---

## Testing Your Setup

### Test 1: Database Connection
1. Go to **Table Editor** in Supabase
2. Try inserting a test row into `tenants` table
3. Should work without errors

### Test 2: Authentication
1. Go to http://localhost:5173/register
2. Create a new account
3. Check **Authentication** → **Users** in Supabase dashboard
4. User should appear

### Test 3: Email Verification
1. Go to **Authentication** → **Logs** in Supabase
2. You should see email verification sent
3. Check your email (or check the logs for the verification link)

---

## Quick Checklist

- [ ] Database migrations applied (7 tables created)
- [ ] RLS policies applied
- [ ] API keys copied to `.env` file
- [ ] Edge Functions deployed (6 functions)
- [ ] Edge Function secrets configured
- [ ] Auth redirect URLs configured
- [ ] Dependencies installed (`npm install`)
- [ ] App runs (`npm run dev`)
- [ ] Registration works
- [ ] Can see users in Supabase dashboard

---

## Tenant Invite & Admin setup

1. Run the migration to add the `tenant_invites` table:
   - Apply `supabase/migrations/005_tenant_invites.sql` in your Supabase SQL editor or migration runner.

2. Deploy Edge Functions:
   - `createInvite` and `acceptInvite` are located under `supabase/functions/`.
   - Deploy them using the Supabase CLI or your deployment process and set `SERVICE_ROLE_KEY` and `SUPABASE_URL` env vars.
   - (Optional) For email invites, set `RESEND_API_KEY` and `FRONTEND_URL` (or `VITE_FRONTEND_URL`) and `INVITE_FROM`.

3. Optional: wire an email provider to `createInvite` to send real invites instead of returning tokens in the response.

---

## Alternative: Try CLI from a Non-OneDrive Folder

If you want to try the CLI again:

1. Copy your project to a local folder (not in OneDrive):
   ```powershell
   xcopy "C:\Users\rajpa\OneDrive\Documentos\Staffing CRM" "C:\Dev\Staffing-CRM" /E /I
   cd C:\Dev\Staffing-CRM
   ```

2. Then try:
   ```powershell
   npx supabase link --project-ref yvcsxadahzrxuptcgtkg
   npx supabase db push
   ```

---

## Need Help?

If you get stuck:
1. Check the Supabase dashboard logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Make sure tables are created in Table Editor

Let me know when you've completed the migrations and I'll help you with the next steps!

---

## Deploy frontend to Vercel

1. Create a new project in Vercel and connect your repo.
2. In Project Settings → Environment Variables, add:
   - `VITE_SUPABASE_URL` — your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `VITE_FUNCTIONS_URL` — base URL for your Supabase Edge Functions (e.g., https://<project>.functions.supabase.co)
   - `VITE_FRONTEND_URL` — your Vercel deployment URL
3. Deploy.

## Deploy Supabase Edge Functions

1. Use supabase-cli to deploy functions from `supabase/functions/`.
2. Set environment variables in the Supabase project settings for Functions:
   - `SERVICE_ROLE_KEY`, `SUPABASE_URL`, `RESEND_API_KEY`, `FRONTEND_URL`, `INVITE_FROM`.

Be sure to test the invite flow in a staging environment before enabling in production.
