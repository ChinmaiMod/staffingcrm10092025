# Business-Specific Resend API Keys Feature

## Overview
This feature allows each business within a tenant to configure their own Resend API keys, enabling emails to be sent from their own verified domains instead of a shared system domain.

## Database Schema

### Table: `business_resend_api_keys`
```sql
- config_id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key → tenants)
- business_id: UUID (Foreign Key → businesses)
- resend_api_key: TEXT (Resend API key)
- from_email: TEXT (Verified sender email)
- from_name: TEXT (Optional display name)
- is_active: BOOLEAN (Enable/disable configuration)
- created_at: TIMESTAMPTZ
- created_by: UUID
- updated_at: TIMESTAMPTZ
- updated_by: UUID
```

**Constraints:**
- UNIQUE(tenant_id, business_id) - One config per business
- Full RLS policies for tenant isolation

## User Interface

### Location
**Data Administration → Configure Resend API Keys**
- Path: `/crm/data-admin/resend-api-keys`
- Icon: 🔑

### Features
1. **Add Configuration**
   - Select business from dropdown
   - Enter Resend API key (starts with `re_`)
   - Enter verified sender email
   - Optional sender display name
   - Active/Inactive toggle

2. **View Configurations**
   - Table showing all business configs
   - API key masked for security (shows first 8 + last 4 characters)
   - Business name, from email, from name, status

3. **Edit Configuration**
   - Inline editing in table
   - Update API key, email, name, or status
   - Changes saved immediately

4. **Delete Configuration**
   - Remove business API config
   - Falls back to system default

## Email Sending Logic

### System Default
Used for emails without business context:
- User registration
- Password reset
- Email verification
- System notifications

### Business-Specific
Used for business-related emails:
- Bulk emails to contacts
- Contact notifications
- Team communications
- Any email associated with a specific business

### Fallback Hierarchy
```
1. Check for active business-specific API key
2. If not found → Use system default API key
3. If system default not configured → Error
```

## Implementation Details

### Frontend Utilities
**File:** `src/api/resendConfig.js`

```javascript
getResendConfig(businessId, tenantId)
// Returns: { apiKey, fromEmail, fromName }
// Queries database for business config or falls back to system

getSystemResendConfig()
// Returns system default configuration
```

### Edge Function Utilities
**File:** `supabase/functions/_shared/resendConfig.ts`

```typescript
getResendConfig(businessId, tenantId): Promise<ResendConfig>
// Deno module for edge functions
// Uses service role to query API keys

getSystemResendConfig(): ResendConfig
// Returns environment variable defaults
```

### Updated Edge Functions

#### `sendBulkEmail`
**New Parameters:**
- `businessId` (optional): Business to send emails from
- `tenantId` (optional): Tenant ID for query

**Behavior:**
1. Receives businessId and tenantId in request
2. Calls `getResendConfig(businessId, tenantId)`
3. Uses returned API key and from email
4. Sends emails with business-specific branding

## Setup Instructions

### 1. Configure System Default (Required)
Set environment variables in Supabase:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_NAME=Your Company Name
```

### 2. Configure Business-Specific (Optional)
1. Navigate to **Data Administration → Configure Resend API Keys**
2. Click **"+ Add API Configuration"**
3. Select business from dropdown
4. Enter Resend API key from your Resend account
5. Enter verified sender email (must be verified in Resend)
6. Optionally enter sender display name
7. Ensure "Active" is checked
8. Click **"Add Configuration"**

### 3. Verify Email in Resend
Before using a custom domain:
1. Log in to your Resend account
2. Go to Domains section
3. Add and verify your domain
4. Add specific sender emails if needed
5. Wait for DNS verification to complete

### 4. Test Email Sending
1. Send a bulk email from the CRM
2. Check email headers to confirm sender domain
3. Verify branding matches business

## Frontend Integration

### BulkEmailModal Component
**TODO:** Update to pass businessId and tenantId

```javascript
// Example usage
const response = await callEdgeFunction(
  'sendBulkEmail',
  {
    recipients: selectedContacts,
    subject: emailSubject,
    body: emailBody,
    businessId: selectedBusinessId, // Add this
    tenantId: tenant.tenant_id      // Add this
  },
  userToken
);
```

## Security Considerations

### Current Implementation
- API keys stored in plain text in database
- Protected by RLS policies
- Only accessible by service role in edge functions

### Recommended Enhancements
1. **Encryption at Rest**
   - Encrypt API keys before storing
   - Decrypt only when needed in edge functions
   - Use Supabase Vault or similar

2. **API Key Rotation**
   - Add created/updated tracking
   - Notify admins when keys are old
   - Support multiple keys with primary/backup

3. **Audit Logging**
   - Log all API key usage
   - Track which emails used which keys
   - Monitor for suspicious activity

4. **Rate Limiting**
   - Prevent API key abuse
   - Track usage per business
   - Alert on unusual patterns

## Error Handling

### Scenarios

1. **No API Key Configured**
   - Business config missing
   - Falls back to system default
   - Logs warning message

2. **Invalid API Key**
   - Resend API returns 401
   - Email fails to send
   - Error returned to user

3. **Unverified Email Domain**
   - Resend API returns 422
   - Email fails to send
   - Suggest domain verification

4. **Database Query Error**
   - Can't fetch business config
   - Falls back to system default
   - Logs error for debugging

## Future Enhancements

### Email Templates per Business
- Store HTML templates per business
- Support template variables
- Preview before sending

### Email Analytics
- Track open rates per business
- Monitor deliverability
- A/B testing support

### Webhook Configuration
- Configure webhooks per business
- Track bounces and complaints
- Automatic unsubscribe handling

### Multi-Provider Support
- Support SendGrid, Mailgun, etc.
- Allow business to choose provider
- Unified interface for all providers

## Testing Checklist

- [ ] Add business API configuration via UI
- [ ] Edit existing configuration
- [ ] Delete configuration
- [ ] Send bulk email with business config
- [ ] Send bulk email without business config (fallback)
- [ ] Verify correct sender domain in emails
- [ ] Test with invalid API key
- [ ] Test with unverified domain
- [ ] Check RLS policies prevent cross-tenant access
- [ ] Verify system emails use default config

## Troubleshooting

### Emails Not Sending
1. Check if API key is active in database
2. Verify API key is valid in Resend account
3. Confirm sender email is verified
4. Check edge function logs for errors
5. Verify businessId is being passed correctly

### Wrong Sender Domain
1. Check which config is being used (logs)
2. Verify business_id matches
3. Confirm is_active = true
4. Check for multiple configs (should be prevented)

### Performance Issues
1. Review database indexes
2. Check query performance
3. Monitor API response times
4. Consider caching configs

## API Reference

### Frontend Function
```javascript
import { getResendConfig } from '../api/resendConfig';

const config = await getResendConfig(businessId, tenantId);
// Returns: { apiKey, fromEmail, fromName }
```

### Edge Function
```typescript
import { getResendConfig } from '../_shared/resendConfig.ts';

const config = await getResendConfig(businessId, tenantId);
// Returns: Promise<{ apiKey, fromEmail, fromName }>
```

## Support

For issues or questions:
1. Check edge function logs: Supabase Dashboard → Edge Functions → Logs
2. Check database: Query `business_resend_api_keys` table
3. Review Resend dashboard for API errors
4. Contact support with error logs

---

**Version:** 1.0  
**Last Updated:** October 15, 2025  
**Migration:** 028_create_business_resend_api_keys.sql
