# Resend Email Configuration Guide

## Overview
This guide explains how to configure Resend API for all application emails, replacing Supabase's default email service.

## Resend Account Details
- **API Key**: `re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv`
- **Verified Domain**: `updates.ojosh.com`
- **From Email**: `noreply@updates.ojosh.com`
- **Feedback Email**: `feedback@updates.ojosh.com`

## Configuration Steps

### 1. Add Resend API Key to Supabase Secrets

```bash
# Using Supabase CLI
supabase secrets set RESEND_API_KEY=re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv

# Or via Supabase Dashboard:
# 1. Go to https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/settings/functions
# 2. Navigate to "Edge Function Secrets"
# 3. Add secret: RESEND_API_KEY = re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv
```

### 2. Configure Supabase Auth to Use Custom SMTP

**Important**: Supabase Auth emails (registration confirmation, password reset, email change) are controlled by Supabase's built-in email service. To use Resend for these emails, you need to configure custom SMTP:

1. **Go to Supabase Dashboard**:
   - Navigate to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/settings/auth
   - Click on "SMTP Settings"

2. **Configure Resend SMTP**:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 587 (or 465 for SSL)
   Username: resend
   Password: re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv
   Sender Name: Staffing CRM
   Sender Email: noreply@updates.ojosh.com
   ```

3. **Enable Custom SMTP**:
   - Toggle "Enable Custom SMTP Settings" to ON
   - Click "Save"

### 3. Configure Email Templates in Supabase

After enabling custom SMTP, customize the email templates:

1. **Go to Email Templates**:
   - Navigate to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/templates

2. **Update Each Template**:

   **A. Confirm Signup Email**
   ```html
   Subject: Confirm your email for {{ .SiteURL }}
   
   <!DOCTYPE html>
   <html>
   <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
       <h1 style="margin: 0;">Welcome to Staffing CRM</h1>
     </div>
     <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
       <p>Hi there,</p>
       <p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="{{ .ConfirmationURL }}" 
            style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
           Confirm Email Address
         </a>
       </div>
       <p style="color: #6b7280; font-size: 14px;">
         If the button doesn't work, copy and paste this link into your browser:<br>
         <a href="{{ .ConfirmationURL }}" style="color: #3b82f6;">{{ .ConfirmationURL }}</a>
       </p>
       <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
         This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
       </p>
     </div>
   </body>
   </html>
   ```

   **B. Reset Password Email**
   ```html
   Subject: Reset your password for {{ .SiteURL }}
   
   <!DOCTYPE html>
   <html>
   <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
       <h1 style="margin: 0;">Password Reset Request</h1>
     </div>
     <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
       <p>Hi there,</p>
       <p>We received a request to reset your password. Click the button below to create a new password:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="{{ .ConfirmationURL }}" 
            style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
           Reset Password
         </a>
       </div>
       <p style="color: #6b7280; font-size: 14px;">
         If the button doesn't work, copy and paste this link into your browser:<br>
         <a href="{{ .ConfirmationURL }}" style="color: #3b82f6;">{{ .ConfirmationURL }}</a>
       </p>
       <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
         This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
       </p>
     </div>
   </body>
   </html>
   ```

   **C. Magic Link Email**
   ```html
   Subject: Sign in to {{ .SiteURL }}
   
   <!DOCTYPE html>
   <html>
   <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
       <h1 style="margin: 0;">Sign In to Staffing CRM</h1>
     </div>
     <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
       <p>Hi there,</p>
       <p>Click the button below to sign in to your account:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="{{ .ConfirmationURL }}" 
            style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
           Sign In
         </a>
       </div>
       <p style="color: #6b7280; font-size: 14px;">
         If the button doesn't work, copy and paste this link into your browser:<br>
         <a href="{{ .ConfirmationURL }}" style="color: #3b82f6;">{{ .ConfirmationURL }}</a>
       </p>
       <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
         This link will expire in 1 hour. If you didn't request this email, you can safely ignore it.
       </p>
     </div>
   </body>
   </html>
   ```

   **D. Change Email Address**
   ```html
   Subject: Confirm email address change for {{ .SiteURL }}
   
   <!DOCTYPE html>
   <html>
   <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
       <h1 style="margin: 0;">Confirm Email Change</h1>
     </div>
     <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
       <p>Hi there,</p>
       <p>We received a request to change your email address. Click the button below to confirm this change:</p>
       <div style="text-align: center; margin: 30px 0;">
         <a href="{{ .ConfirmationURL }}" 
            style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
           Confirm Email Change
         </a>
       </div>
       <p style="color: #6b7280; font-size: 14px;">
         If the button doesn't work, copy and paste this link into your browser:<br>
         <a href="{{ .ConfirmationURL }}" style="color: #3b82f6;">{{ .ConfirmationURL }}</a>
       </p>
       <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
         If you didn't request this change, please contact support immediately.
       </p>
     </div>
   </body>
   </html>
   ```

### 4. Update Supabase Auth URLs

Configure the redirect URLs to use your Vercel deployment:

1. **Go to Auth URL Configuration**:
   - Navigate to: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg/auth/url-configuration

2. **Set URLs** (replace with actual Vercel URL):
   ```
   Site URL: https://your-app.vercel.app
   
   Redirect URLs:
   - https://your-app.vercel.app/**
   - https://your-app.vercel.app/reset-password
   - https://your-app.vercel.app/verify-email
   - http://localhost:5173/** (for local development)
   ```

### 5. Verify Resend Domain

Ensure `updates.ojosh.com` is verified in Resend:

1. **Go to Resend Dashboard**: https://resend.com/domains
2. **Check verification status** for `updates.ojosh.com`
3. **Verify DNS records** are properly configured:
   ```
   Type: TXT
   Name: updates.ojosh.com
   Value: [Resend verification token]
   
   Type: MX
   Name: updates.ojosh.com
   Value: feedback-smtp.email (priority 10)
   ```

### 6. Test Email Sending

After configuration, test each email flow:

#### A. Test Password Reset Email
1. Go to Forgot Password page
2. Enter email address
3. Check that email is received from `noreply@updates.ojosh.com`
4. Click reset link
5. Verify redirects to `/reset-password` correctly

#### B. Test Registration Email
1. Register new user account
2. Check verification email from `noreply@updates.ojosh.com`
3. Click confirmation link
4. Verify account activates successfully

#### C. Test Feedback Email
1. Submit feedback form
2. Check that admin receives email at `feedback@updates.ojosh.com`
3. Verify email formatting and reply-to address

## Email Types Summary

| Email Type | From Address | Template | Edge Function |
|------------|-------------|----------|---------------|
| Email Verification | noreply@updates.ojosh.com | Supabase Auth | N/A (Supabase) |
| Password Reset | noreply@updates.ojosh.com | Supabase Auth | N/A (Supabase) |
| Magic Link | noreply@updates.ojosh.com | Supabase Auth | N/A (Supabase) |
| Email Change | noreply@updates.ojosh.com | Supabase Auth | N/A (Supabase) |
| Feedback Notification | noreply@updates.ojosh.com | Custom HTML | sendFeedbackEmail |
| Issue Report | noreply@updates.ojosh.com | Custom HTML | (future) sendIssueEmail |

## Current Issues & Fixes

### Issue 1: Password Reset Link Error
**Problem**: Password reset link shows error: "requested path is invalid"

**Root Cause**: 
- `VITE_FRONTEND_URL` not set in environment
- Redirect URL was `undefined/reset-password`

**Solution Applied**:
```javascript
// AuthProvider.jsx - Fixed
const redirectUrl = import.meta.env.VITE_FRONTEND_URL 
  ? `${import.meta.env.VITE_FRONTEND_URL}/reset-password`
  : `${window.location.origin}/reset-password`;
```

**Additional Steps**:
1. Set `VITE_FRONTEND_URL` in Vercel environment variables
2. Update Supabase Auth redirect URLs to include Vercel domain
3. Test password reset flow end-to-end

### Issue 2: Emails from Supabase Instead of Resend
**Problem**: All auth emails currently sent by Supabase default service

**Solution**: Configure custom SMTP (see Section 2 above)

## Environment Variables Checklist

### Supabase Edge Function Secrets
- [x] `RESEND_API_KEY` = re_T4sdMKxP_KfjVjWwvn69BMNzVFJp7DoPv
- [ ] Verify secret is set: `supabase secrets list`

### Vercel Environment Variables
- [ ] `VITE_FRONTEND_URL` = https://your-app.vercel.app
- [ ] Verify in Vercel Dashboard: Settings > Environment Variables

### Local Development (.env.local)
```bash
VITE_FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### Email Not Received
1. Check Resend API logs: https://resend.com/emails
2. Verify domain verification status
3. Check spam/junk folder
4. Verify SMTP credentials in Supabase

### Password Reset Link Invalid
1. Check `VITE_FRONTEND_URL` is set correctly
2. Verify redirect URL in Supabase Auth settings
3. Check Edge Function logs for errors
4. Ensure URL includes `/reset-password` path

### From Address Wrong
1. Verify SMTP settings in Supabase Auth
2. Check Resend domain verification
3. Update "Sender Email" in Supabase SMTP config

## Next Steps

1. **Immediate**:
   - [ ] Add RESEND_API_KEY to Supabase secrets
   - [ ] Configure Supabase SMTP settings with Resend
   - [ ] Update email templates in Supabase Dashboard
   - [ ] Set VITE_FRONTEND_URL in Vercel

2. **Testing**:
   - [ ] Test password reset flow
   - [ ] Test registration email
   - [ ] Test feedback email
   - [ ] Verify all emails come from updates.ojosh.com

3. **Future Enhancements**:
   - [ ] Create sendIssueEmail Edge Function
   - [ ] Add email tracking/analytics
   - [ ] Implement email preferences for users
   - [ ] Add custom email templates for business features

## Support Resources

- **Resend Dashboard**: https://resend.com/
- **Resend Documentation**: https://resend.com/docs
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/auth-smtp
- **Supabase Project**: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg
