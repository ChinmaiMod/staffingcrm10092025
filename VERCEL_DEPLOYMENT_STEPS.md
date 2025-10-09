# Vercel Deployment via GitHub Integration

**Date:** October 9, 2025  
**Branch:** `deployment/production-ready`  
**Team:** OJosh's projects

---

## 🎯 Step-by-Step Deployment Guide

### Step 1: Go to Vercel Dashboard

Open your browser and navigate to:
```
https://vercel.com/new
```

**Or use this direct link for your team:**
```
https://vercel.com/new?teamSlug=ojoshs-projects-96c2aaac
```

### Step 2: Import Git Repository

1. Click **"Add New..."** → **"Project"**
2. In the "Import Git Repository" section:
   - Click **"Import"** next to `ChinmaiMod/staffingcrm`
   - If you don't see it, click "Add GitHub Account" to authorize access

### Step 3: Configure Project

You'll see the configuration screen. Set these values:

#### Project Name
```
staffingcrm
```
(or choose your preferred name)

#### Framework Preset
```
Vite
```
(Should auto-detect)

#### Root Directory
```
./
```
(Leave as default)

#### Build Settings
```
Build Command:        npm run build
Output Directory:     dist
Install Command:      npm install
```

#### Branch to Deploy
```
deployment/production-ready
```

### Step 4: Environment Variables

Click **"Environment Variables"** section and add these one by one:

#### Required Variables (Add These Now):

**1. VITE_SUPABASE_URL**
```
https://yvcsxadahzrxuptcgtkg.supabase.co
```

**2. VITE_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3N4YWRhaHpyeHVwdGNndGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg4MjMsImV4cCI6MjA3NDg5NDgyM30.RPhdJYZyb8SWSKm_pNkD0tg5MbBdMMIiw5BVsDtNcdo
```

**3. VITE_FUNCTIONS_URL**
```
https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1
```

**4. VITE_ENV**
```
production
```

#### Optional Variables (Can Add After Deployment):

**5. VITE_STRIPE_PUBLISHABLE_KEY**
```
[Get from Stripe Dashboard - leave blank for now]
```

**6. VITE_FRONTEND_URL**
```
[Will be your Vercel URL - add after deployment]
```

**7. VITE_CRM_APP_URL**
```
[Will be your Vercel URL + /crm - add after deployment]
```

**8. VITE_SUITE_APP_URL**
```
[Will be your Vercel URL + /suite - add after deployment]
```

### Step 5: Deploy

1. Review all settings
2. Click **"Deploy"** button
3. Wait 2-3 minutes for the build to complete

You'll see:
- ✅ Building... (installing dependencies, running build)
- ✅ Deploying... (uploading to CDN)
- ✅ Ready! (deployment complete)

---

## 📝 After Deployment

### 1. Get Your Vercel URL

After deployment completes, you'll see:
```
https://staffingcrm-xyz.vercel.app
```
(Copy this URL)

### 2. Update Environment Variables in Vercel

Go to: **Project Settings** → **Environment Variables**

Add/Update these:

```
VITE_FRONTEND_URL=https://staffingcrm-xyz.vercel.app
VITE_CRM_APP_URL=https://staffingcrm-xyz.vercel.app/crm
VITE_SUITE_APP_URL=https://staffingcrm-xyz.vercel.app/suite
```

Then click **"Redeploy"** to apply changes.

### 3. Update Supabase Auth URLs

Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/url-configuration

**Site URL:**
```
https://staffingcrm-xyz.vercel.app
```

**Redirect URLs (add this):**
```
https://staffingcrm-xyz.vercel.app/**
```

Click **"Save"**

### 4. Configure Stripe (When Ready)

**In Stripe Dashboard:**
1. Get your Publishable Key: https://dashboard.stripe.com/apikeys
2. Add to Vercel environment variables: `VITE_STRIPE_PUBLISHABLE_KEY`

**Set up Webhook:**
- URL: `https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1/stripeWebhook`
- Events: 
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

**Add Secrets to Supabase:**
Go to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/settings/vault

Add these secrets:
```
STRIPE_SECRET_KEY=[from Stripe Dashboard]
STRIPE_WEBHOOK_SECRET=[from Stripe Webhook Settings]
RESEND_API_KEY=[from Resend Dashboard]
```

### 5. Configure Resend Email (When Ready)

1. Verify domain: `ojosh.com`
2. Verify sender emails:
   - `noreply@ojosh.com`
   - `feedback@ojosh.com`
3. Get API key: https://resend.com/api-keys
4. Add to Supabase Secrets (see step 4)

---

## ✅ Verification Checklist

After deployment, test these features:

- [ ] Visit your Vercel URL - homepage loads
- [ ] Registration flow works
- [ ] Email verification link works
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Feedback form submits successfully
- [ ] Issue reporting works with screenshot upload
- [ ] Role-based access control works
- [ ] Stripe checkout initiates (if configured)

---

## 🔄 Future Deployments

**Good News:** Once connected, Vercel will automatically deploy whenever you push to the `deployment/production-ready` branch!

```bash
# Make changes to your code
git add .
git commit -m "feat: add new feature"
git push origin deployment/production-ready

# Vercel automatically deploys! 🚀
```

---

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set correctly
- Ensure `package.json` has all dependencies

### 404 on Routes
- Vercel should auto-handle SPA routing for Vite
- If issues persist, create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### API Calls Fail
- Check browser console for errors
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- Check Supabase RLS policies

### Environment Variables Not Working
- Ensure variable names start with `VITE_`
- After adding/changing variables, redeploy the project
- Check "Deployments" tab to see which env vars were used

---

## 📊 Current Deployment Status

**Backend:** ✅ Ready
- Supabase Project: ACTIVE_HEALTHY
- Database: Migrated (user_feedback, issue_reports)
- Edge Functions: 7/7 deployed
- Storage Buckets: 4/4 configured

**Frontend:** ⏳ Deploying Now
- GitHub Branch: `deployment/production-ready`
- Vercel Team: OJosh's projects
- Build: Vite + React

**Estimated Time:** 5-10 minutes to complete deployment

---

**Last Updated:** October 9, 2025  
**Status:** Ready for Deployment 🚀
