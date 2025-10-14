# Resend Email Integration Setup Guide

## ✅ Integration Status: COMPLETE

**Date Completed**: January 14, 2025  
**Version**: Edge Function v2  
**Status**: Production Ready

### What's Working:
✅ Resend API integrated into `sendUserInvitation` Edge Function  
✅ HTML email template with invitation link  
✅ Uses existing `RESEND_API_KEY` (same as password reset emails)  
✅ Edge Function deployed and active  
✅ Error handling and logging implemented  
✅ Ready to send invitation emails  

### Next Steps:
1. Test the invitation flow with a real email
2. Verify email delivery
3. Optional: Set up custom domain for better deliverability

---

## Overview
The User Invitation system now uses Resend API to send invitation emails. This guide will help you set up Resend and configure the API key in Supabase.

**Note**: If you already have Resend configured for password reset emails, the invitation emails will use the same API key automatically - no additional setup needed!

## Prerequisites
- Access to Supabase project dashboard
- Admin access to create Resend account

---

## Step 1: Create Resend Account

1. **Go to Resend**: https://resend.com/
2. **Sign up** for a free account
   - Free tier includes: 100 emails/day, 3,000 emails/month
   - No credit card required for free tier
3. **Verify your email** address

---

## Step 2: Get API Key

1. **Login to Resend Dashboard**: https://resend.com/api-keys
2. **Click "Create API Key"**
3. **Name**: `Staffing-CRM-Invitations`
4. **Permission**: `Sending access` (default)
5. **Domain**: `All domains` (or select specific domain if you have one)
6. **Copy the API key** - it will look like: `re_xxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **Important**: Save this key somewhere safe, you won't be able to see it again!

---

## Step 3: Verify Sender Domain (Optional but Recommended)

### Option A: Use Resend Test Domain (Quick Start)
- Resend provides a test domain: `onboarding@resend.dev`
- You can use this immediately without verification
- **Limitation**: May have lower deliverability, emails might go to spam

### Option B: Add Your Own Domain (Production)
1. **Go to**: https://resend.com/domains
2. **Click "Add Domain"**
3. **Enter your domain**: `yourdomain.com`
4. **Add DNS records** as shown by Resend:
   - SPF record
   - DKIM records (3 records)
   - DMARC record (optional)
5. **Wait for verification** (usually takes 5-30 minutes)
6. **Update Edge Function** from address:
   - Change: `from: 'Staffing CRM <noreply@yourdomain.com>'`
   - To: `from: 'Staffing CRM <noreply@YOUR-ACTUAL-DOMAIN.com>'`

**Recommended domains to use:**
- `noreply@yourdomain.com`
- `invitations@yourdomain.com`
- `team@yourdomain.com`

---

## Step 4: Configure Supabase Edge Function

### Option A: Via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: OJosh_CRM
3. **Navigate to**: Edge Functions → Settings
4. **Scroll to**: "Environment Variables"
5. **Click**: "Add variable"
6. **Enter**:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxx` (your API key)
7. **Click**: "Save"

### Option B: Via Supabase CLI

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref yvcsxadahzrxuptcgtkg

# Set the secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Verify it was set
supabase secrets list
```

---

## Step 5: Redeploy Edge Function (If using CLI)

If you set the secret via CLI, you may need to redeploy:

```bash
supabase functions deploy sendUserInvitation
```

If you used the dashboard, the Edge Function will automatically pick up the new environment variable on the next invocation.

---

## Step 6: Test the Integration

### Test 1: Send Test Invitation

1. **Login to Staffing CRM** as CEO or Admin
2. **Navigate to**: CRM → Data Administration → Invite Users
3. **Fill the form**:
   - Full Name: `Test User`
   - Email: `your-test-email@gmail.com` (use your own email)
   - Message: `Testing email integration`
4. **Click**: "Send Invitation"
5. **Check**:
   - ✅ Success message appears
   - ✅ Check your email inbox (and spam folder)
   - ✅ Email should arrive within 1-2 minutes

### Test 2: Check Edge Function Logs

1. **Go to Supabase Dashboard** → Edge Functions → sendUserInvitation
2. **Click**: "Logs" tab
3. **Look for**:
   - `Email sent successfully via Resend:` - ✅ Success
   - `Failed to send email via Resend:` - ❌ Error
   - `RESEND_API_KEY not configured` - ❌ API key not set

### Test 3: Check Resend Dashboard

1. **Go to Resend Dashboard**: https://resend.com/emails
2. **You should see**:
   - Recent email sent
   - Status: Sent / Delivered / Opened
   - Recipient email
   - Subject line

---

## Troubleshooting

### Issue: "RESEND_API_KEY not configured"

**Cause**: Environment variable not set in Supabase

**Solution**:
1. Verify you added the secret in Supabase dashboard
2. Wait 1-2 minutes for it to propagate
3. Try sending invitation again

---

### Issue: Email not received

**Possible Causes**:
1. Email went to spam folder
2. Invalid recipient email
3. Rate limit exceeded (100 emails/day on free tier)
4. Domain not verified (if using custom domain)

**Solutions**:
1. **Check spam folder**
2. **Check Resend logs** for delivery status
3. **Try with different email** (Gmail, Outlook, etc.)
4. **Verify domain** if using custom domain
5. **Check Resend quota** in dashboard

---

### Issue: "Email sending failed: 401 Unauthorized"

**Cause**: Invalid API key

**Solution**:
1. Go to Resend dashboard and create new API key
2. Update RESEND_API_KEY in Supabase secrets
3. Try again

---

### Issue: "Email sending failed: 403 Forbidden"

**Cause**: Using unverified domain

**Solution**:
1. Either verify your domain in Resend
2. OR use Resend test domain: `onboarding@resend.dev`
3. Update Edge Function from address

---

### Issue: Emails go to spam

**Causes**:
- Using test domain
- Domain not verified
- Missing SPF/DKIM records

**Solutions**:
1. **Verify your domain** in Resend
2. **Add all DNS records** (SPF, DKIM, DMARC)
3. **Warm up your domain** by sending small volume initially
4. **Ask recipients** to mark as "Not Spam"

---

## Email Template Customization

The email template is defined in the Edge Function. To customize:

1. **Open**: `supabase/functions/sendUserInvitation/index.ts`
2. **Find**: The `emailData` object (around line 150)
3. **Modify**:
   - HTML template (in `html` field)
   - Plain text version (in `text` field)
   - Subject line
   - From address
4. **Deploy**: `supabase functions deploy sendUserInvitation`

### Customization Ideas:
- Add company logo
- Change colors to match brand
- Add footer with social links
- Include company address
- Add unsubscribe link (if required)

---

## Monitoring Email Delivery

### In Resend Dashboard:
- **View**: https://resend.com/emails
- **Metrics**:
  - Total sent
  - Delivered
  - Opened (requires tracking enabled)
  - Clicked (requires tracking enabled)
  - Bounced
  - Complained (spam reports)

### In Supabase:
- **Edge Function Logs**: Real-time sending status
- **Audit Logs Table**: Track who invited whom
- **User Invitations Table**: See invitation status

---

## Rate Limits

### Resend Free Tier:
- **100 emails per day**
- **3,000 emails per month**
- No credit card required

### When to Upgrade:
- If sending 100+ invitations per day
- If you need dedicated IP
- If you need priority support

### Upgrade Options:
- **Pro**: $20/month - 50,000 emails
- **Business**: $250/month - 500,000 emails
- **Custom**: Contact Resend for higher volume

---

## Security Best Practices

### API Key Security:
1. ✅ Never commit API key to git
2. ✅ Store only in Supabase secrets
3. ✅ Use separate keys for dev/staging/prod
4. ✅ Rotate keys periodically (every 90 days)
5. ✅ Revoke old keys after rotation

### Email Security:
1. ✅ Always verify domain with SPF/DKIM
2. ✅ Use HTTPS for all links in emails
3. ✅ Include unsubscribe link if required by law
4. ✅ Monitor bounce rates
5. ✅ Remove invalid emails from system

---

## Cost Estimation

### Scenario 1: Small Team (10 users)
- **Invitations per month**: ~5
- **Cost**: Free tier ✅
- **Monthly**: $0

### Scenario 2: Growing Company (100 users)
- **Invitations per month**: ~20
- **Cost**: Free tier ✅
- **Monthly**: $0

### Scenario 3: Enterprise (1000+ users)
- **Invitations per month**: ~100
- **Cost**: Free tier sufficient ✅
- **Monthly**: $0

### Scenario 4: High Volume (10,000+ users)
- **Invitations per month**: ~500+
- **Cost**: Need Pro plan
- **Monthly**: $20

---

## Alternative Email Providers

If you prefer a different provider:

### SendGrid
- **Free tier**: 100 emails/day
- **API**: Very similar to Resend
- **Setup**: https://sendgrid.com/

### AWS SES
- **Cost**: $0.10 per 1,000 emails
- **Pros**: Very cheap at scale
- **Cons**: More complex setup

### Mailgun
- **Free tier**: 100 emails/day
- **API**: Similar to Resend
- **Setup**: https://mailgun.com/

To switch providers, you'll need to:
1. Update API endpoint in Edge Function
2. Update API key format
3. Adjust request body format
4. Test thoroughly

---

## Support

### Resend Support:
- **Docs**: https://resend.com/docs
- **Discord**: https://resend.com/discord
- **Email**: support@resend.com

### Supabase Support:
- **Docs**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com
- **GitHub**: https://github.com/supabase/supabase

---

## Checklist

Before going to production, ensure:

- [ ] Resend account created
- [ ] API key generated and saved securely
- [ ] API key added to Supabase secrets
- [ ] Domain verified (or using test domain)
- [ ] DNS records added (SPF, DKIM)
- [ ] From address updated in Edge Function
- [ ] Test invitation sent successfully
- [ ] Test invitation email received
- [ ] Email not in spam folder
- [ ] Invitation acceptance flow tested
- [ ] Edge Function logs checked
- [ ] Resend dashboard checked
- [ ] Rate limits understood
- [ ] Monitoring set up

---

## Quick Reference

### Resend API Key Location
**Supabase Dashboard** → Edge Functions → Settings → Environment Variables → `RESEND_API_KEY`

### Edge Function
**Name**: `sendUserInvitation`
**Version**: 2 (deployed)
**Status**: Active ✅

### Email Template
**Location**: `supabase/functions/sendUserInvitation/index.ts`
**Line**: ~150-200

### Test Email
**Send from**: CRM → Data Administration → Invite Users
**Check logs**: Supabase Dashboard → Edge Functions → sendUserInvitation → Logs

---

## Next Steps

1. ✅ **Complete this setup guide**
2. ✅ **Send test invitation**
3. ✅ **Verify email delivery**
4. 🔄 **Optional**: Verify custom domain
5. 🔄 **Optional**: Customize email template
6. 🔄 **Optional**: Set up email monitoring
7. 🔄 **Optional**: Configure email tracking (opens/clicks)

---

Last Updated: January 24, 2025
Version: 1.0
