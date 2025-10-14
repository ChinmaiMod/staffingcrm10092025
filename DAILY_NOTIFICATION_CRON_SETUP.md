# Daily Notification Cron Setup - 9 AM Automated Delivery

## Overview

This setup configures your Staffing CRM to automatically check and send scheduled notifications **every day at 9:00 AM UTC** using Supabase's native pg_cron extension.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL Database (Supabase)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  pg_cron Extension                                   │   │
│  │  • Runs daily at 9:00 AM UTC                        │   │
│  │  • Executes: trigger_daily_notifications()          │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│                      ▼                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  trigger_daily_notifications() Function              │   │
│  │  • Counts due notifications                         │   │
│  │  • Calls edge function via pg_net                   │   │
│  └───────────────────┬──────────────────────────────────┘   │
└────────────────────────┼──────────────────────────────────────┘
                        │
                        │ HTTP POST (pg_net)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase Edge Function: sendScheduledNotifications        │
│  • Fetches notifications where next_send_date <= now()     │
│  • Queries recipients (contacts/internal_staff)            │
│  • Sends emails via Resend API                            │
│  • Logs to notification_history                           │
│  • Updates next_send_date for recurring notifications     │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Resend API                                                 │
│  • Delivers emails to recipients                           │
│  • Returns email IDs for tracking                          │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- ✅ Supabase project on **Pro plan or above** (pg_cron requires Pro)
- ✅ Database migrations applied (016_scheduled_notifications.sql)
- ✅ Edge function deployed (sendScheduledNotifications)
- ✅ Resend API configured (RESEND_API_KEY)

## Step 1: Deploy the Cron Edge Function

```bash
# Deploy the scheduleNotificationCron function
supabase functions deploy scheduleNotificationCron --project-ref yvcsxadahzrxuptcgtkg
```

Expected output:
```
✓ Deployed Function scheduleNotificationCron (version 1)
```

## Step 2: Apply the Database Migration

```bash
# Apply the cron setup migration
supabase db push --project-ref yvcsxadahzrxuptcgtkg
```

Or via MCP (if available):
```javascript
// Use the MCP Supabase tool to apply migration 017_notification_cron_setup.sql
```

This migration will:
- ✅ Enable `pg_cron` extension
- ✅ Enable `pg_net` extension
- ✅ Create `trigger_daily_notifications()` function
- ✅ Schedule cron job for 9:00 AM daily

## Step 3: Configure Database Settings

You need to set two configuration variables in your Supabase database:

### Option A: Via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Project Settings** → **Database**
2. Scroll to **Custom Postgres Configuration**
3. Add these settings:

```
app.supabase_url = https://yvcsxadahzrxuptcgtkg.supabase.co
app.service_role_key = your_service_role_key_here
```

### Option B: Via SQL

Run this SQL in the **SQL Editor**:

```sql
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.supabase_url = 'https://yvcsxadahzrxuptcgtkg.supabase.co';

-- Set Service Role Key (get from Project Settings → API)
ALTER DATABASE postgres 
SET app.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

-- Reload configuration
SELECT pg_reload_conf();
```

**⚠️ Important:** Replace `your_service_role_key_here` with your actual service role key from:
- **Supabase Dashboard** → **Project Settings** → **API** → **service_role** (secret)

## Step 4: Verify the Cron Job is Scheduled

Run this query in SQL Editor:

```sql
-- Check if cron job is scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job 
WHERE jobname = 'daily-notification-processor';
```

Expected result:
```
jobid | jobname                      | schedule    | command                                      | active
------|------------------------------|-------------|----------------------------------------------|-------
1     | daily-notification-processor | 0 9 * * *   | SELECT trigger_daily_notifications()         | t
```

**Schedule breakdown:**
- `0 9 * * *` = At minute 0, hour 9 (9:00 AM), every day
- Runs in **UTC timezone**

## Step 5: Test the System

### Manual Test (Before Waiting for 9 AM)

Run the trigger function manually to test:

```sql
-- Test the notification processor
SELECT trigger_daily_notifications();
```

Expected output (JSON):
```json
{
  "success": true,
  "notifications_due": 2,
  "triggered_at": "2025-10-14T15:30:00+00:00",
  "response_id": 12345
}
```

### Check Cron Execution History

```sql
-- View recent cron job runs
SELECT 
  runid,
  job_name,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'daily-notification-processor'
)
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **sendScheduledNotifications**
2. Click **Logs** tab
3. Look for entries showing notification processing

## Step 6: Create Test Notification

To verify the system works end-to-end:

1. **Go to your app**: CRM → Notifications
2. **Create a test notification**:
   - **Name:** "Test Daily Notification"
   - **Subject:** "Hello {first_name}!"
   - **Body:** "This is a test notification sent at 9 AM."
   - **Recipient Type:** Contacts (or Custom with your email)
   - **Repeat Count:** 2
   - **Interval:** 1 day
   - **Start Date:** Tomorrow's date
   - **Active:** ✅ Checked

3. **Wait until 9:00 AM UTC the next day**
4. **Check your email** for the notification
5. **Verify in database**:

```sql
-- Check notification was processed
SELECT 
  name,
  times_sent,
  repeat_count,
  next_send_date,
  is_completed
FROM scheduled_notifications
WHERE name = 'Test Daily Notification';

-- Check notification history
SELECT 
  sent_at,
  recipient_email,
  status,
  resend_email_id
FROM notification_history
WHERE notification_id = (
  SELECT notification_id 
  FROM scheduled_notifications 
  WHERE name = 'Test Daily Notification'
)
ORDER BY sent_at DESC;
```

## Timezone Considerations

The cron job runs at **9:00 AM UTC**. Convert to your local timezone:

| Timezone | Local Time |
|----------|------------|
| UTC | 9:00 AM |
| EST (New York) | 5:00 AM (or 4:00 AM DST) |
| PST (Los Angeles) | 2:00 AM (or 1:00 AM DST) |
| IST (India) | 2:30 PM |
| AEST (Sydney) | 7:00 PM (or 8:00 PM DST) |

**To change the schedule:**

```sql
-- Update to different time (e.g., 2:00 PM UTC)
SELECT cron.unschedule('daily-notification-processor');
SELECT cron.schedule(
  'daily-notification-processor',
  '0 14 * * *',  -- 2:00 PM UTC
  $$SELECT trigger_daily_notifications()$$
);
```

## Troubleshooting

### Issue: Cron job not running

**Check 1:** Verify pg_cron is enabled
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check 2:** Verify cron job exists
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-notification-processor';
```

**Check 3:** Check for errors in cron execution
```sql
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC LIMIT 5;
```

### Issue: Function can't call edge function

**Error:** "Supabase URL or Service Role Key not configured"

**Solution:** Set database configuration variables (see Step 3)

### Issue: No emails being sent

**Check 1:** Verify RESEND_API_KEY is set in edge function secrets

**Check 2:** Check edge function logs for errors

**Check 3:** Verify notifications have `next_send_date <= now()`
```sql
SELECT 
  name,
  next_send_date,
  is_active,
  is_completed
FROM scheduled_notifications
WHERE is_active = true 
  AND is_completed = false
ORDER BY next_send_date;
```

## Monitoring & Maintenance

### Daily Health Check Query

Run this to monitor notification processing:

```sql
-- Summary of notification system health
SELECT 
  COUNT(*) FILTER (WHERE is_active = true AND is_completed = false) as active_notifications,
  COUNT(*) FILTER (WHERE next_send_date <= now() AND is_active = true AND is_completed = false) as due_now,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_notifications,
  (SELECT COUNT(*) FROM notification_history WHERE sent_at::date = CURRENT_DATE) as emails_sent_today,
  (SELECT MAX(start_time) FROM cron.job_run_details WHERE job_name = 'daily-notification-processor') as last_cron_run
FROM scheduled_notifications;
```

### View Recent Activity

```sql
-- Recent notification sends
SELECT 
  sn.name,
  nh.recipient_email,
  nh.sent_at,
  nh.status,
  nh.error_message
FROM notification_history nh
JOIN scheduled_notifications sn ON sn.notification_id = nh.notification_id
WHERE nh.sent_at >= now() - interval '7 days'
ORDER BY nh.sent_at DESC
LIMIT 20;
```

## Success Criteria

✅ **Cron job scheduled** and appears in `cron.job` table  
✅ **Database config** set (app.supabase_url, app.service_role_key)  
✅ **Manual test** runs successfully  
✅ **Edge function** processes notifications correctly  
✅ **Emails delivered** via Resend API  
✅ **History logged** in notification_history table  
✅ **Next send dates** updated automatically  

## Summary

Your notification system now:

1. 🕘 **Runs automatically** at 9:00 AM UTC every day
2. 📧 **Sends all due notifications** (where next_send_date <= now)
3. 🔄 **Handles recurring** notifications (updates next_send_date)
4. 📊 **Logs everything** to notification_history
5. ✅ **Marks complete** when all sends are done (times_sent >= repeat_count)

No manual intervention required - fully automated! 🎉
