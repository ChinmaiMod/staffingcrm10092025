# Staffing CRM - Vercel & Supabase Deployment Guide

**Date:** October 9, 2025  
**Project:** Staffing CRM - Multi-tenant SaaS Application  
**Architecture:** Serverless BaaS (Supabase) + Jamstack Frontend (Vercel)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Configuration](#supabase-configuration)
3. [Database Migration](#database-migration)
4. [Edge Functions Deployment](#edge-functions-deployment)
5. [Storage Buckets Setup](#storage-buckets-setup)
6. [Vercel Deployment](#vercel-deployment)
7. [Environment Variables](#environment-variables)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Accounts Required
- ✅ Supabase Account (Project: `OJosh_CRM`)
- ✅ Vercel Account (Team: `OJosh's projects`)
- Stripe Account (for payments)
- Resend Account (for emails)

### Tools Required
- Node.js v18+ 
- npm or yarn
- Supabase CLI
- Vercel CLI (optional)
- Git

---

## 🗄️ Supabase Configuration

### Project Details
- **Project ID:** `yvcsxadahzrxuptcgtkg`
- **Project Name:** `OJosh_CRM`
- **Region:** `us-east-2`
- **Status:** `ACTIVE_HEALTHY`
- **Database Version:** PostgreSQL 17.6.1
- **Project URL:** `https://yvcsxadahzrxuptcgtkg.supabase.co`

### Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3N4YWRhaHpyeHVwdGNndGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg4MjMsImV4cCI6MjA3NDg5NDgyM30.RPhdJYZyb8SWSKm_pNkD0tg5MbBdMMIiw5BVsDtNcdo
```

---

## 🔄 Database Migration

### Current State
- ✅ Migrations Applied: `000_clean_reset`, `001_initial_schema`, `002_rls_policies`, `003_update_profile_status`
- ⏳ Pending Migrations: `004` through `013`

### Migration Strategy

**Option 1: Fresh Deployment (Recommended for Clean Start)**
```sql
-- Use COMBINED_COMPLETE_SCHEMA.sql (v1.3.0)
-- This file includes ALL migrations 001-013 with data population
-- Location: supabase/migrations/COMBINED_COMPLETE_SCHEMA.sql
```

**Option 2: Incremental Migration (If Preserving Data)**
Apply migrations sequentially:
1. `005_tenant_invites.sql` - Tenant invite system
2. `006_super_admin_policies.sql` - Super admin RLS policies
3. `007_crm_contacts_schema.sql` - CRM contacts & reference tables
4. `008_contact_status_history.sql` - Contact status tracking
5. `009_fix_registration_rls.sql` - Registration bugfixes
6. `010_pipelines_schema.sql` - Sales/recruiting pipelines
7. `011_businesses_multi_business_support.sql` - Business entities
8. `012_user_feedback.sql` - User feedback system
9. `013_issue_reports.sql` - Bug tracking system

### Database Schema Overview (Post-Migration)

**Tables:** 31  
**RLS Policies:** 216+  
**Indexes:** 56+  
**Triggers:** 11+  
**Functions:** 20+  
**Reference Records:** 168 pre-populated

#### Core Tables
- `tenants` - Multi-tenant organizations
- `profiles` - User profiles (linked to auth.users)
- `subscriptions` - Billing & plans (FREE/CRM/SUITE)
- `payments` - Payment transactions
- `promo_codes` - Discount codes
- `audit_logs` - Compliance & debugging
- `email_tokens` - Email verification/reset
- `tenant_invites` - User invitations

#### CRM Tables
- `contacts` - Contact/candidate records
- `contact_statuses`, `contact_reasons`, `contact_role_types` - Lookups
- `contact_attachments` - File references (Supabase Storage)
- `contact_comments` - Activity comments
- `pipelines`, `pipeline_stages` - Sales/recruiting workflows
- `businesses` - Business entities
- `business_folders`, `business_documents` - Business file management

#### Reference Tables
- `countries`, `states`, `cities` - Geographic data
- `visa_status` - Visa types (F1, H1B, GC, etc.)
- `job_titles` - IT & Healthcare positions
- `reasons_for_contact` - Contact purposes
- `role_types` - Remote/Hybrid/Onsite
- `years_experience` - Experience ranges
- `referral_sources` - Lead sources

#### User Engagement Tables
- `user_feedback` - Suggestions/ideas (v1.2.0)
- `issue_reports` - Bug tracking (v1.3.0)

#### Configuration Tables
- `email_templates` - Notification templates
- `notification_configs` - Trigger-based alerts

---

## ⚡ Edge Functions Deployment

### Functions to Deploy (6 Total)

1. **createCheckoutSession**
   - Purpose: Stripe checkout session creation
   - Dependencies: Stripe API
   - Environment: `STRIPE_SECRET_KEY`

2. **createTenantAndProfile**
   - Purpose: Tenant registration with admin profile
   - Dependencies: Database access
   - Called by: Registration flow

3. **getPostLoginRoute**
   - Purpose: Role-based dashboard routing
   - Returns: `/dashboard`, `/tenant-admin`, or `/super-admin`
   - Dependencies: Profiles table

4. **resendVerification**
   - Purpose: Resend email verification token
   - Dependencies: Resend API
   - Environment: `RESEND_API_KEY`

5. **stripeWebhook**
   - Purpose: Handle Stripe payment webhooks
   - Events: `checkout.session.completed`, `invoice.paid`, etc.
   - Environment: `STRIPE_WEBHOOK_SECRET`

6. **verifyToken**
   - Purpose: Email verification & password reset
   - Token types: `VERIFY`, `RESET`
   - Dependencies: Email tokens table

### Deployment Command
```bash
# Deploy all functions (using Supabase CLI)
supabase functions deploy createCheckoutSession
supabase functions deploy createTenantAndProfile
supabase functions deploy getPostLoginRoute
supabase functions deploy resendVerification
supabase functions deploy stripeWebhook
supabase functions deploy verifyToken
```

### Function Environment Secrets
```bash
# Set Stripe keys
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Set Resend key
supabase secrets set RESEND_API_KEY=re_xxxxx
```

---

## 📦 Storage Buckets Setup

### Required Buckets

1. **user-feedback-screenshots**
   - Purpose: Screenshot uploads for feedback
   - Path: `feedback-screenshots/{tenant_id}/{filename}`
   - Max file size: 5MB
   - Allowed types: image/png, image/jpeg, image/webp

2. **issue-screenshots**
   - Purpose: Screenshot uploads for bug reports
   - Path: `issue-screenshots/{tenant_id}/{filename}`
   - Max file size: 5MB
   - Allowed types: image/png, image/jpeg, image/webp

3. **contact-attachments**
   - Purpose: Resumes, documents for contacts
   - Path: `contact-attachments/{tenant_id}/{contact_id}/{filename}`
   - Max file size: 10MB
   - Allowed types: application/pdf, image/*, application/msword, etc.

4. **business-documents**
   - Purpose: Business entity documents
   - Path: `business-documents/{tenant_id}/{business_id}/{filename}`
   - Max file size: 10MB

### RLS Policies for Buckets
```sql
-- Users can upload to their tenant's folder
CREATE POLICY "tenant_upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-feedback-screenshots' AND
    (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );

-- Users can view their tenant's files
CREATE POLICY "tenant_view" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-feedback-screenshots' AND
    (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );

-- Repeat for issue-screenshots, contact-attachments, business-documents
```

---

## 🚀 Vercel Deployment

### Project Configuration

**Team:** `team_opv1wdFRuCmk8xVBY5AYAM6E` (OJosh's projects)

### Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### Environment Variables (Production)

Create `.env.production`:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://yvcsxadahzrxuptcgtkg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2Y3N4YWRhaHpyeHVwdGNndGtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTg4MjMsImV4cCI6MjA3NDg5NDgyM30.RPhdJYZyb8SWSKm_pNkD0tg5MbBdMMIiw5BVsDtNcdo

# Edge Functions URL
VITE_FUNCTIONS_URL=https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1

# Stripe Configuration (Get from Stripe Dashboard)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# App URLs (Will be generated after first deployment)
VITE_FRONTEND_URL=https://your-app.vercel.app
VITE_CRM_APP_URL=https://your-app.vercel.app/crm
VITE_SUITE_APP_URL=https://your-app.vercel.app/suite

# Environment
VITE_ENV=production
```

### Deployment Steps

1. **Link to Vercel (if not already linked)**
   ```bash
   vercel link
   # Select: OJosh's projects
   # Project name: staffing-crm
   ```

2. **Set Environment Variables**
   ```bash
   # Via Vercel Dashboard
   # Project Settings > Environment Variables
   # Add all VITE_* variables above
   ```

3. **Deploy**
   ```bash
   # Production deployment
   vercel --prod
   
   # Or push to main branch (auto-deploy)
   git push origin main
   ```

4. **Update Auth Redirect URLs**
   After deployment, update Supabase Auth settings:
   ```
   Site URL: https://your-app.vercel.app
   Redirect URLs: https://your-app.vercel.app/**
   ```

---

## 🔧 Post-Deployment Verification

### 1. Database Check
```sql
-- Verify tables created
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 31 tables

-- Verify reference data populated
SELECT COUNT(*) FROM visa_status; -- Expected: 15
SELECT COUNT(*) FROM job_titles; -- Expected: 43
SELECT COUNT(*) FROM countries; -- Expected: 2
SELECT COUNT(*) FROM states; -- Expected: 78
```

### 2. Edge Functions Check
```bash
# List deployed functions
supabase functions list

# Test a function
curl -X POST https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1/getPostLoginRoute \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 3. Frontend Check
- [ ] Home page loads
- [ ] Registration flow works
- [ ] Email verification works
- [ ] Login works
- [ ] Dashboard renders based on role
- [ ] CRM module accessible (CRM/SUITE plans)
- [ ] Feedback form submits successfully
- [ ] Issue reporting form works
- [ ] Stripe checkout initiates

### 4. Storage Check
- [ ] Feedback screenshot upload works
- [ ] Issue screenshot upload works
- [ ] Files accessible via URLs
- [ ] RLS prevents unauthorized access

---

## 🐛 Troubleshooting

### Common Issues

**Issue: Build fails with missing environment variables**
```
Solution: Ensure all VITE_* variables are set in Vercel project settings
```

**Issue: 403 Forbidden on API calls**
```
Solution: Check RLS policies, verify user has correct tenant_id in profiles table
```

**Issue: Edge function timeout**
```
Solution: Check function logs in Supabase Dashboard > Edge Functions > Logs
Optimize database queries, add indexes if needed
```

**Issue: Stripe webhook not triggering**
```
Solution: 
1. Verify webhook endpoint: https://yvcsxadahzrxuptcgtkg.supabase.co/functions/v1/stripeWebhook
2. Check Stripe Dashboard > Webhooks > Events
3. Verify STRIPE_WEBHOOK_SECRET matches
```

**Issue: Email not sending**
```
Solution:
1. Check Resend API key is valid
2. Verify sender email is verified in Resend
3. Check edge function logs for errors
```

---

## 📊 Capacity & Performance

**Current Tier:** Supabase Pro + Vercel Pro  
**Estimated Cost:** $45/month  
**Concurrent Users:** 500-1,000  
**Database Connections:** 200 (with pgBouncer)  
**Storage:** 100GB (Supabase) + 1TB bandwidth (Vercel)

### Scaling Recommendations
- **500+ users:** Consider upgrading to Supabase Team ($599/month)
- **1000+ users:** Implement Redis caching layer
- **High file uploads:** Consider dedicated CDN (Cloudflare R2)
- **Complex queries:** Add materialized views for reporting

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Architecture Capacity Analysis](./ARCHITECTURE_CAPACITY_ANALYSIS.md)
- [GitHub Repository](https://github.com/ChinmaiMod/staffingcrm)

---

**Last Updated:** October 9, 2025  
**Schema Version:** 1.3.0  
**Deployment Status:** In Progress ⏳
