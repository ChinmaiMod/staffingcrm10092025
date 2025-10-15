# Quick Setup Guide: User Invitation Email Configuration

## Overview
To enable email sending for user invitations, you need to configure environment variables in Supabase and set up a verified domain in Resend.

## Step 1: Sign Up for Resend (Free Tier)

1. Go to [Resend.com](https://resend.com)
2. Sign up for free account (100 emails/day free)
3. Verify your email

## Step 2: Get Resend API Key

1. Go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it "Staffing CRM Production"
4. Copy the API key (starts with `re_`)
5. **Save it securely** - you won't see it again

## Step 3: Add Domain to Resend (Optional but Recommended)

### Option A: Use Resend's Free Domain (Quick Start)
- Default sender: `onboarding@resend.dev`
- No setup required
- Limited to 100 emails/day
- May end up in spam folder

### Option B: Use Your Own Domain (Recommended for Production)
1. Go to [Resend Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records provided by Resend:
   ```
   Type    Name                Value
   TXT     @                   v=spf1 include:_spf.resend.com ~all
   TXT     resend._domainkey   [DKIM value from Resend]
   TXT     _dmarc              v=DMARC1; p=none
   ```
5. Wait for verification (usually 15-30 minutes)
6. Once verified, you can use emails like `no-reply@yourdomain.com`

## Step 4: Set Supabase Environment Variables

### Via Supabase Dashboard:
1. Go to your project: https://supabase.com/dashboard/project/yvcsxadahzrxuptcgtkg
2. Navigate to **Settings** → **Edge Functions** → **Manage secrets**
3. Add the following secrets:

```bash
# Required
RESEND_API_KEY=re_your_actual_api_key_here

# Recommended
FRONTEND_URL=https://staffingcrm10092025.vercel.app
FROM_EMAIL=no-reply@yourdomain.com
FROM_NAME=Your Company Name

# System defaults (if not set)
# FRONTEND_URL defaults to http://localhost:5173
# FROM_EMAIL defaults to no-reply@staffingcrm.app
# FROM_NAME defaults to Staffing CRM
```

### Via Supabase CLI:
```bash
# Set RESEND_API_KEY
npx supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here --project-ref yvcsxadahzrxuptcgtkg

# Set FRONTEND_URL
npx supabase secrets set FRONTEND_URL=https://staffingcrm10092025.vercel.app --project-ref yvcsxadahzrxuptcgtkg

# Set FROM_EMAIL
npx supabase secrets set FROM_EMAIL=no-reply@yourdomain.com --project-ref yvcsxadahzrxuptcgtkg

# Set FROM_NAME
npx supabase secrets set FROM_NAME="Your Company Name" --project-ref yvcsxadahzrxuptcgtkg

# Verify secrets are set
npx supabase secrets list --project-ref yvcsxadahzrxuptcgtkg
```

## Step 5: Test the Invitation Flow

### Test with Resend's Free Domain (Quick Test):
1. Set environment variables:
   ```bash
   RESEND_API_KEY=re_your_key
   FRONTEND_URL=https://staffingcrm10092025.vercel.app
   FROM_EMAIL=onboarding@resend.dev
   FROM_NAME=Staffing CRM Test
   ```

2. Send a test invitation:
   - Login as admin
   - Go to Data Administration → Invite Users
   - Invite yourself at a different email
   - Check inbox (including spam folder)

3. Accept invitation:
   - Click link in email
   - Set password
   - Verify account created with READ_ONLY role

### Test with Your Own Domain:
1. Verify domain in Resend first
2. Update environment variables:
   ```bash
   FROM_EMAIL=no-reply@yourdomain.com
   FROM_NAME=Your Company Name
   ```

3. Send invitation and verify email delivery

## Step 6: Verify Everything Works

### Checklist:
- [ ] Resend API key is set in Supabase secrets
- [ ] Domain is verified in Resend (if using custom domain)
- [ ] FRONTEND_URL points to your deployed app
- [ ] FROM_EMAIL uses verified domain
- [ ] Test invitation email received
- [ ] Email not in spam folder
- [ ] Invitation link works correctly
- [ ] User can create account
- [ ] User assigned READ_ONLY role
- [ ] Admin can change role in UI

## Troubleshooting

### Email Not Received
**Check:**
1. Spam/junk folder
2. Resend API key is correct
3. Edge function logs for errors:
   ```bash
   # View logs
   npx supabase functions logs sendUserInvitation --project-ref yvcsxadahzrxuptcgtkg
   ```

**Common Issues:**
- API key not set: Check Supabase secrets
- Domain not verified: Wait for DNS propagation
- Rate limit exceeded: Check Resend dashboard
- Invalid FROM_EMAIL: Must match verified domain

### Email Goes to Spam
**Fix:**
- Use verified custom domain (not resend.dev)
- Add SPF, DKIM, DMARC records
- Use professional from address
- Avoid spam trigger words in message

### Invitation Link Doesn't Work
**Check:**
1. FRONTEND_URL is correct
2. Link format: `{FRONTEND_URL}/accept-invitation?token={token}`
3. Token is valid in database
4. Invitation not expired/revoked

**Fix:**
```bash
# Check invitation in database
SELECT id, email, status, expires_at, token 
FROM user_invitations 
WHERE email = 'user@example.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Role Not Assigned
**Check:**
```sql
-- Check if user has role assignment
SELECT ura.*, ur.role_name, ur.role_level
FROM user_role_assignments ura
JOIN user_roles ur ON ura.role_id = ur.role_id
WHERE ura.user_id = 'user-uuid';
```

**Fix:**
```sql
-- Manually assign READ_ONLY role
INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by, is_active)
VALUES (
  'user-uuid', 
  1, -- READ_ONLY role
  'tenant-uuid', 
  'admin-uuid', 
  true
);
```

## Production Recommendations

### Email Deliverability:
1. **Use your own domain** - Better deliverability, professional appearance
2. **Set up DMARC** - Prevent email spoofing
3. **Monitor email logs** - Track delivery in Resend dashboard
4. **Keep sending volume consistent** - Avoid sudden spikes
5. **Warm up domain** - Start with small volumes, gradually increase

### Security:
1. **Keep API keys secret** - Never commit to git
2. **Use environment variables** - Different keys for dev/prod
3. **Rotate keys regularly** - Every 3-6 months
4. **Monitor usage** - Watch for unusual activity
5. **Set up alerts** - Get notified of delivery failures

### Rate Limits:
- **Free tier**: 100 emails/day, 3,000/month
- **Paid tier**: Higher limits based on plan
- **Monitor usage**: Check Resend dashboard
- **Queue invitations**: If sending many at once

### Cost Optimization:
- **Free tier sufficient** for most small teams (< 100 invites/month)
- **Paid tier** if sending > 100 invites/day
- **Batch invitations** instead of one-by-one
- **Clean up expired invitations** to reduce database size

## Environment Variable Reference

| Variable | Required | Default | Example | Purpose |
|----------|----------|---------|---------|---------|
| `RESEND_API_KEY` | ✅ Yes | - | `re_abc123...` | Resend API authentication |
| `FRONTEND_URL` | ⚠️ Recommended | `http://localhost:5173` | `https://yourapp.vercel.app` | Base URL for invitation links |
| `FROM_EMAIL` | ⚠️ Recommended | `no-reply@staffingcrm.app` | `no-reply@yourdomain.com` | Sender email address |
| `FROM_NAME` | ❌ Optional | `Staffing CRM` | `Your Company Name` | Sender display name |

## Support

### Resend Support:
- Docs: https://resend.com/docs
- Support: https://resend.com/support
- Discord: https://resend.com/discord

### Supabase Support:
- Docs: https://supabase.com/docs
- Support: https://supabase.com/support
- Discord: https://discord.supabase.com

---

**Last Updated**: October 15, 2025  
**Status**: ✅ Ready for Production
