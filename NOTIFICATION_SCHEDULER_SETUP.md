# Automated Notification Scheduler Setup Guide

## Problem
Currently, scheduled notifications are stored in the database but NOT automatically sent. The `sendScheduledNotifications` edge function must be triggered manually.

## Solution Options

### **Option 1: GitHub Actions (Recommended - Free & Easy)**

Create `.github/workflows/notification-scheduler.yml`:

```yaml
name: Notification Scheduler
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Notification Processor
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            "${{ secrets.SUPABASE_URL }}/functions/v1/sendScheduledNotifications"
```

**Setup:**
1. Add secrets to GitHub repo:
   - `SUPABASE_URL` = Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Service role key from Supabase
2. GitHub Actions runs automatically every hour

**Pros:** ✅ Free, ✅ Easy to set up, ✅ Reliable
**Cons:** ⚠️ Minimum 5-minute intervals, ⚠️ Requires GitHub repo

---

### **Option 2: Vercel Cron Jobs**

If using Vercel for frontend deployment:

Create `pages/api/cron/notifications.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sendScheduledNotifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const result = await response.json()
    res.status(200).json({ success: true, result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/notifications",
    "schedule": "0 * * * *"
  }]
}
```

**Pros:** ✅ Integrated with Vercel, ✅ Reliable
**Cons:** ⚠️ Requires Vercel Pro plan ($20/month) for cron jobs

---

### **Option 3: Supabase pg_cron + pg_net (Database-Native)**

Enable in Supabase Dashboard → Database → Extensions:
- `pg_cron` - Cron scheduler
- `pg_net` - HTTP requests from database

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cron job
SELECT cron.schedule(
  'process-scheduled-notifications',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sendScheduledNotifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )
  $$
);
```

**Setup:**
1. Enable `pg_cron` and `pg_net` extensions in Supabase
2. Set configuration variables for URLs and keys
3. Create the scheduled job

**Pros:** ✅ Runs in database, ✅ No external dependencies
**Cons:** ⚠️ May not be available on all Supabase plans, ⚠️ Complex setup

---

### **Option 4: Supabase Edge Function with Scheduled Trigger**

Deploy the provided `scheduleNotificationCron` function:

```bash
supabase functions deploy scheduleNotificationCron
```

Then schedule it in Supabase Dashboard:
1. Go to **Database → Cron Jobs**
2. Create new cron job:
   - **Name:** `notification-processor`
   - **Schedule:** `0 * * * *` (every hour)
   - **Function:** Call the edge function via pg_net

**Pros:** ✅ Supabase-native, ✅ Centralized
**Cons:** ⚠️ Requires pro plan features

---

## Recommendation

**For immediate use:** Use **GitHub Actions** (Option 1)
- Free, reliable, easy to set up
- Works immediately without plan upgrades

**For long-term:** Use **Supabase pg_cron + pg_net** (Option 3)
- Native to Supabase
- No external dependencies
- Most scalable

---

## Current Workaround (Until Automation Set Up)

Manually trigger the function to send due notifications:

```bash
# Using curl
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/sendScheduledNotifications

# Or from the Supabase Dashboard → Edge Functions → sendScheduledNotifications → Invoke
```

---

## Next Steps

1. **Choose your preferred scheduling option** from above
2. **Deploy the scheduler** following the setup instructions
3. **Test** by creating a notification with start_date = now
4. **Verify** emails are sent automatically at the scheduled interval
