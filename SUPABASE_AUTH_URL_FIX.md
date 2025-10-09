# Fix Supabase Auth URLs and Email Configuration

**Issue**: Reset password links going to `supabase.co` instead of your Vercel app  
**Issue**: Emails coming from Supabase instead of Resend  
**Date**: October 9, 2025

---

## Problem

When users request password reset:
1. ❌ Link goes to: `yvcaxadahrzxuptcgtkg.supabase.co/staffingcrm-9taz.vercel.app#access_token=...`
2. ❌ Should go to: `staffingcrm10092025.vercel.app/reset-password#access_token=...`
3. ❌ Emails sent from: Supabase (noreply@mail.app.supabase.io)
4. ❌ Should send from: Resend (noreply@updates.ojosh.com)

---

## Solution: Configure Supabase Authentication URLs

### Step 1: Get Your Vercel Production URL

Your Vercel URL is: `https://staffingcrm10092025.vercel.app`

### Step 2: Update Supabase Auth Configuration

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open Authentication Settings**
   - Click on **Authentication** (left sidebar)
   - Click on **URL Configuration**

3. **Update Site URL**
   ```
   Site URL: https://staffingcrm10092025.vercel.app
   ```
   - This is the main URL of your application
   - Click **Save**

4. **Update Redirect URLs**
   
   Add these URLs to the **Redirect URLs** list:
   ```
   https://staffingcrm10092025.vercel.app/**
   https://staffingcrm10092025.vercel.app/reset-password
   https://staffingcrm10092025.vercel.app/verify-email
   http://localhost:5173/**
   http://localhost:5173/reset-password
   http://localhost:5173/verify-email
   ```
   
   **Important**: The `**` wildcard allows all paths under that domain
   
   - Click **Save**

5. **Email Template Configuration**
   
   - Click on **Email Templates** (under Authentication)
   - Update each template:

   **A. Confirm Signup Template**
   - Subject: `Confirm Your Email - Staffing CRM`
   - Body: Update the `{{ .ConfirmationURL }}` to use your domain
   - The URL should automatically use the Site URL you configured

   **B. Reset Password Template**
   - Subject: `Reset Your Password - Staffing CRM`
   - Body: Update the `{{ .ConfirmationURL }}` to use your domain
   - The URL should automatically use the Site URL you configured

   **C. Magic Link Template**
   - Subject: `Sign In to Staffing CRM`
   - Body: Update the `{{ .ConfirmationURL }}` to use your domain

---

## Solution: Configure Resend for Email Sending

### Step 3: Configure Custom SMTP (Resend)

1. **Go to SMTP Settings**
   - In Supabase Dashboard
   - Click on **Project Settings** (gear icon, bottom left)
   - Click on **Auth** under **Configuration**
   - Scroll to **SMTP Settings**

2. **Enable Custom SMTP**
   - Toggle **Enable Custom SMTP** to ON

3. **Enter Resend SMTP Details**
   ```
   Sender Name: Staffing CRM
   Sender Email: noreply@updates.ojosh.com
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv
   ```

4. **Click Save**

5. **Test Email Sending**
   - Try password reset again
   - Email should now come from `noreply@updates.ojosh.com`

---

## Solution: Add Environment Variable to Vercel

### Step 4: Set VITE_FRONTEND_URL in Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your project: https://vercel.com/chinmaimods-projects/staffingcrm10092025

2. **Go to Settings**
   - Click on **Settings** tab
   - Click on **Environment Variables**

3. **Add New Variable**
   ```
   Name: VITE_FRONTEND_URL
   Value: https://staffingcrm10092025.vercel.app
   Environment: Production, Preview, Development (select all)
   ```

4. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** tab
   - Click on the three dots (...) next to latest deployment
   - Click **Redeploy**

---

## Verification Steps

### Test 1: Password Reset Link
1. Go to: https://staffingcrm10092025.vercel.app/forgot-password
2. Enter your email: `your-email@example.com`
3. Click "Send Reset Link"
4. Check your email
5. ✅ **Expected**: Email from `noreply@updates.ojosh.com`
6. ✅ **Expected**: Link goes to `staffingcrm10092025.vercel.app/reset-password`
7. ❌ **Wrong**: Link goes to `supabase.co`

### Test 2: Email Source
1. Check the email you received
2. ✅ **Expected**: From: `Staffing CRM <noreply@updates.ojosh.com>`
3. ❌ **Wrong**: From: `noreply@mail.app.supabase.io`

### Test 3: Reset Password Flow
1. Click the link in the email
2. ✅ **Expected**: Opens `staffingcrm10092025.vercel.app/reset-password`
3. ✅ **Expected**: Shows "Reset Your Password" form
4. Enter new password
5. ✅ **Expected**: Password updated successfully
6. ✅ **Expected**: Can login with new password

---

## Quick Fix Checklist

Copy these exact values into Supabase:

### Supabase Auth URLs
- [ ] **Site URL**: `https://staffingcrm10092025.vercel.app`
- [ ] **Redirect URLs**:
  - [ ] `https://staffingcrm10092025.vercel.app/**`
  - [ ] `https://staffingcrm10092025.vercel.app/reset-password`
  - [ ] `https://staffingcrm10092025.vercel.app/verify-email`
  - [ ] `http://localhost:5173/**`

### Supabase Custom SMTP (Resend)
- [ ] **Enable Custom SMTP**: ON
- [ ] **Sender Name**: `Staffing CRM`
- [ ] **Sender Email**: `noreply@updates.ojosh.com`
- [ ] **Host**: `smtp.resend.com`
- [ ] **Port**: `587`
- [ ] **Username**: `resend`
- [ ] **Password**: `re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv`

### Vercel Environment Variable
- [ ] **Name**: `VITE_FRONTEND_URL`
- [ ] **Value**: `https://staffingcrm10092025.vercel.app`
- [ ] **Environments**: Production, Preview, Development

---

## Troubleshooting

### Issue: Still going to supabase.co after configuration
**Solution**: 
1. Clear browser cache
2. Wait 2-3 minutes for Supabase config to propagate
3. Try incognito/private window
4. Check Supabase Dashboard > Authentication > URL Configuration shows correct Site URL

### Issue: Emails still from Supabase
**Solution**:
1. Verify SMTP settings saved correctly
2. Check Resend dashboard for email sending activity
3. Test with new email request (old emails in queue may still use Supabase)
4. Verify Resend API key is valid

### Issue: 404 on /reset-password
**Solution**:
1. Verify route exists in App.jsx
2. Check Vercel deployment includes latest code
3. Verify build succeeded on Vercel

### Issue: "Invalid redirect URL" error
**Solution**:
1. Make sure the redirect URL is in the Redirect URLs list
2. Include the `**` wildcard
3. URL must match exactly (https vs http, trailing slash)

---

## Email Template HTML (Optional Enhancement)

If you want better-looking emails, update the email templates in Supabase:

### Reset Password Email Template

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #4F46E5; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Staffing CRM</h1>
  </div>
  
  <div style="padding: 30px; background-color: #f9fafb;">
    <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
    
    <p style="color: #4b5563; line-height: 1.6;">
      You requested to reset your password. Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      If you didn't request this, you can safely ignore this email.
      Your password will not be changed.
    </p>
    
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This link will expire in 60 minutes for security reasons.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #9ca3af; font-size: 12px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: #4F46E5; word-break: break-all;">
        {{ .ConfirmationURL }}
      </a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2025 Staffing CRM. All rights reserved.</p>
  </div>
</div>
```

---

## Current Configuration Status

### ✅ Code Configuration
- [x] AuthProvider.jsx uses VITE_FRONTEND_URL with fallback
- [x] Reset password redirect configured
- [x] Build passing on Vercel

### ⏳ Manual Configuration Needed
- [ ] Supabase Site URL (5 seconds)
- [ ] Supabase Redirect URLs (30 seconds)
- [ ] Supabase Custom SMTP (2 minutes)
- [ ] Vercel VITE_FRONTEND_URL (1 minute)

**Total Time**: ~5 minutes

---

## After Configuration

Once you complete the manual steps above:

1. **Test immediately** - Password reset should work
2. **Check email source** - Should be from Resend
3. **Verify redirect** - Should go to your Vercel app
4. **Clear browser cache** - If you see old behavior

---

## Support Links

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/auth-email
- **Supabase SMTP Docs**: https://supabase.com/docs/guides/auth/auth-smtp
- **Resend SMTP Docs**: https://resend.com/docs/send-with-smtp
- **Vercel Env Vars**: https://vercel.com/docs/concepts/projects/environment-variables

---

**Document Created**: October 9, 2025  
**Status**: ⏳ Awaiting manual Supabase configuration  
**Priority**: 🔴 High - Blocks password reset functionality
