# Bulk Email Feature - Resend API Integration

## Overview
The CRM includes a powerful bulk email feature that allows you to select multiple contacts and send personalized emails using the Resend API.

## Features

### 1. **Contact Selection**
- Checkbox selection for individual contacts
- "Select All" option to quickly select all filtered contacts
- Visual indicator showing how many contacts are selected
- Easy deselection with "Clear Selection" button

### 2. **Bulk Email Composer**
- Subject line input
- Message body with multi-line text area
- Variable substitution support:
  - `{first_name}` - Contact's first name
  - `{last_name}` - Contact's last name
  - `{name}` - Full name (first + last)
- Preview of all recipients before sending

### 3. **Email Personalization**
Each email is automatically personalized with the recipient's information. For example:

**Template:**
```
Hi {first_name},

We have an exciting opportunity for a {job_title} position...

Best regards,
Recruiting Team
```

**Sent to John Doe:**
```
Hi John,

We have an exciting opportunity for a Java Developer position...

Best regards,
Recruiting Team
```

## Setup Instructions

### 1. Get Resend API Key

1. Sign up at [Resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Copy the API key

### 2. Configure Domain (Required for Production)

1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Add DNS records as instructed by Resend
4. Wait for verification (usually a few minutes)

### 3. Update Environment Variables

Add to your `.env` file:

```bash
# Resend Email API
RESEND_API_KEY=re_your_api_key_here
```

Also update the edge function code in `supabase/functions/sendBulkEmail/index.ts`:

```typescript
from: 'noreply@yourdomain.com', // Replace with your verified domain
```

### 4. Deploy Edge Function

```bash
# Deploy the sendBulkEmail function
supabase functions deploy sendBulkEmail --project-ref YOUR_PROJECT_REF

# Set the Resend API key as a secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here --project-ref YOUR_PROJECT_REF
```

## Usage Guide

### Sending Bulk Emails

1. **Navigate to Contacts**
   - Go to CRM → Contacts

2. **Filter Contacts (Optional)**
   - Use search, status, or type filters to narrow down contacts
   - Filter by timeframe (this week, this month)

3. **Select Recipients**
   - Click checkboxes next to contacts you want to email
   - Or use "Select All" to select all visible contacts
   - Selected count appears in blue banner

4. **Compose Email**
   - Click "✉️ Send Email to Selected" button
   - Enter subject line
   - Write your message
   - Use variables for personalization: `{first_name}`, `{last_name}`, `{name}`

5. **Review & Send**
   - Review the list of recipients
   - Click "✉️ Send Email"
   - Wait for confirmation

6. **Confirmation**
   - Success message shows how many emails were sent
   - Any failures are reported
   - Selection is automatically cleared

## API Reference

### Edge Function: `sendBulkEmail`

**Endpoint:** `POST /functions/v1/sendBulkEmail`

**Request Body:**
```json
{
  "recipients": [
    {
      "email": "john@example.com",
      "name": "John Doe"
    }
  ],
  "subject": "Your Subject Here",
  "body": "Email message with {first_name} variables"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emails sent: 5 successful, 0 failed",
  "successful": 5,
  "failed": 0,
  "total": 5
}
```

### Frontend API Call

```javascript
import { sendBulkEmail } from '../../api/edgeFunctions'
import { useAuth } from '../../../contexts/AuthProvider'

const { session } = useAuth()

const recipients = [
  { email: 'john@example.com', name: 'John Doe' },
  { email: 'jane@example.com', name: 'Jane Smith' }
]

try {
  const result = await sendBulkEmail(
    recipients,
    'Job Opportunity',
    'Hi {first_name}, we have a great opportunity...',
    session?.access_token
  )
  
  console.log(`Sent to ${result.successful} contacts`)
} catch (error) {
  console.error('Failed to send emails:', error)
}
```

## Email Templates

### Professional Job Opportunity
```
Subject: Exciting {job_title} Opportunity

Hi {first_name},

We came across your profile and believe you'd be a great fit for a {job_title} position we're currently recruiting for.

Details:
- Position: {job_title}
- Location: Remote/Hybrid
- Visa: Sponsorship available

Would you be interested in learning more?

Best regards,
[Your Name]
[Company Name]
```

### Follow-up Template
```
Subject: Following up on our conversation

Hi {first_name},

I wanted to follow up on our previous conversation regarding the {job_title} opportunity.

Are you still interested in pursuing this role?

Looking forward to hearing from you.

Best,
[Your Name]
```

## Best Practices

1. **Segment Your Audience**
   - Use filters to target specific groups
   - Don't send generic emails to everyone

2. **Personalize Content**
   - Always use `{first_name}` for a personal touch
   - Reference their `{job_title}` when relevant

3. **Test First**
   - Send a test email to yourself before bulk sending
   - Check formatting and variable substitution

4. **Timing**
   - Send during business hours (9 AM - 5 PM)
   - Avoid weekends for professional emails

5. **Compliance**
   - Include unsubscribe option (add to template)
   - Follow CAN-SPAM and GDPR guidelines
   - Only email contacts who gave consent

## Troubleshooting

### Emails Not Sending

1. **Check API Key**
   ```bash
   supabase secrets list --project-ref YOUR_PROJECT_REF
   ```

2. **Verify Domain**
   - Ensure domain is verified in Resend dashboard
   - Check DNS records are correct

3. **Check Logs**
   ```bash
   supabase functions logs sendBulkEmail --project-ref YOUR_PROJECT_REF
   ```

### Common Errors

**"RESEND_API_KEY not configured"**
- Solution: Set the secret in Supabase

**"Unauthorized"**
- Solution: User must be logged in, check session token

**"No recipients provided"**
- Solution: Select at least one contact with a valid email

## Limitations

- **Resend Free Tier:** 100 emails/day, 3,000 emails/month
- **Resend Paid Tiers:** Higher limits based on plan
- **Rate Limits:** Respect Resend's rate limits
- **Email Size:** Keep under 10MB including HTML

## Future Enhancements

- [ ] Email template library
- [ ] Scheduled sending
- [ ] A/B testing
- [ ] Email analytics (open rates, clicks)
- [ ] Attachment support
- [ ] HTML email editor
- [ ] Unsubscribe management
- [ ] Email history/logs in UI

## Support

For issues or questions:
1. Check Resend documentation: https://resend.com/docs
2. Review Supabase Edge Functions docs
3. Check edge function logs for errors
