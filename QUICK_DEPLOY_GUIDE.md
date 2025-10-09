# Quick Deploy to Vercel Guide

## Option 1: GitHub Integration (Recommended - Easiest)

### Step 1: Push to GitHub
```bash
# Commit all changes
git add .
git commit -m "feat: Complete Supabase setup with storage buckets and environment config"
git push origin feature/feedback-and-combined-schema

# Or merge to main for production deployment
git checkout main
git merge feature/feedback-and-combined-schema
git push origin main
```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your account
3. Click "Add New..." → "Project"
4. Import `ChinmaiMod/staffingcrm` repository
5. Select team: **OJosh's projects**

### Step 3: Configure Project
- **Framework Preset:** Vite
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 4: Environment Variables
Click "Environment Variables" and add these (copy from `.env.production`):

```
VITE_SUPABASE_URL=https://yvcsxadahzrxuptcgtkg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3N4YWRhaHpyeHVwdGNndGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg4MjMsImV4cCI6MjA3NDg5NDgyM30.RPhdJYZyb8SWSKm_pNkD0tg5MbBdMMIiw5BVsDtNcdo
VITE_FUNCTIONS_URL=https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1
VITE_STRIPE_PUBLISHABLE_KEY=[GET FROM STRIPE DASHBOARD]
VITE_ENV=production
```

**Note:** Leave `VITE_FRONTEND_URL`, `VITE_CRM_APP_URL`, and `VITE_SUITE_APP_URL` empty for now. Update after deployment.

### Step 5: Deploy
Click "Deploy" and wait ~2-3 minutes.

---

## Option 2: Vercel CLI (Advanced)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login
```bash
vercel login
```

### Step 3: Link Project
```bash
cd d:\Staffing-CRM
vercel link
# Select: OJosh's projects
# Project name: staffing-crm
```

### Step 4: Set Environment Variables
```bash
# Set each variable individually
vercel env add VITE_SUPABASE_URL production
# Paste: https://yvcsxadahzrxuptcgtkg.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3N4YWRhaHpyeHVwdGNndGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg4MjMsImV4cCI6MjA3NDg5NDgyM30.RPhdJYZyb8SWSKm_pNkD0tg5MbBdMMIiw5BVsDtNcdo

vercel env add VITE_FUNCTIONS_URL production
# Paste: https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1

vercel env add VITE_ENV production
# Paste: production
```

### Step 5: Deploy
```bash
# Production deployment
vercel --prod
```

---

## Post-Deployment Steps

### 1. Update Environment Variables
After deployment, Vercel will give you a URL like `https://staffing-crm-xyz.vercel.app`

Update these variables in Vercel Dashboard:
```
VITE_FRONTEND_URL=https://your-actual-url.vercel.app
VITE_CRM_APP_URL=https://your-actual-url.vercel.app/crm
VITE_SUITE_APP_URL=https://your-actual-url.vercel.app/suite
```

### 2. Update Supabase Auth URLs
Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/url-configuration):

**Site URL:**
```
https://your-actual-url.vercel.app
```

**Redirect URLs:**
```
https://your-actual-url.vercel.app/**
```

### 3. Set Supabase Secrets (If not already done)
Go to [Supabase Dashboard](https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/settings/functions) > Edge Functions > Secrets:

```
RESEND_API_KEY=[Get from Resend Dashboard]
STRIPE_SECRET_KEY=[Get from Stripe Dashboard]
STRIPE_WEBHOOK_SECRET=[Get from Stripe Webhook Settings]
```

### 4. Configure Stripe Webhook
In [Stripe Dashboard](https://dashboard.stripe.com/webhooks):
- **Endpoint URL:** `https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1/stripeWebhook`
- **Events to send:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

---

## Troubleshooting

### Build Fails
- Check all environment variables are set
- Verify `package.json` has correct scripts
- Check build logs in Vercel Dashboard

### 404 on Routes
- Vercel automatically handles SPA routing for Vite
- If issues persist, add `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### API Calls Fail
- Verify CORS is enabled in Supabase
- Check RLS policies are correct
- Verify anon key is correct

---

## Current Status

✅ **Backend Ready:**
- Supabase database configured
- 7 Edge Functions deployed
- 4 Storage buckets with RLS
- Environment variables documented

⏳ **Frontend Deployment:**
- Use GitHub integration (recommended)
- Or install Vercel CLI and deploy manually

---

**Estimated Time:** 10 minutes via GitHub, 15 minutes via CLI
