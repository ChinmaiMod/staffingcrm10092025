# ✅ FINAL SETUP STEPS - Daily 9 AM Notification Automation

## 🎯 What's Been Deployed

✅ **Database Migration 017** - pg_cron + pg_net setup  
✅ **Edge Function: scheduleNotificationCron** (v1) - Deployed  
✅ **Edge Function: sendScheduledNotifications** (v2) - Deployed  
✅ **Cron Job Scheduled** - `daily-notification-processor` runs at 9:00 AM UTC daily  
✅ **Database Function** - `trigger_daily_notifications()` created  

## ⚠️ REQUIRED: Configure Database Settings

**You MUST complete this step for the cron to work!**

### Method 1: Via SQL (Quickest)

Copy your **Service Role Key** from:
- Supabase Dashboard → Project Settings → API → service_role (click "Reveal" to copy)

Then run this SQL in **SQL Editor**:

```sql
-- Set Supabase URL
ALTER DATABASE postgres 
SET app.supabase_url = 'https://yvcsxadahzrxuptcgtkg.supabase.co';

-- Set Service Role Key (REPLACE WITH YOUR ACTUAL KEY!)
ALTER DATABASE postgres 
SET app.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE';

-- Reload configuration
SELECT pg_reload_conf();
```

### Method 2: Via Supabase Dashboard

1. Go to: **Project Settings → Database → Custom Postgres Configuration**
2. Add these settings:
   - `app.supabase_url` = `https://yvcsxadahzrxuptcgtkg.supabase.co`
   - `app.service_role_key` = Your service role key

## 🧪 Test the Setup

### Step 1: Verify Cron Job Exists

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'daily-notification-processor';
```

**Expected:** 1 row with schedule = `0 9 * * *` and active = `true`

### Step 2: Manually Test the Function

```sql
SELECT trigger_daily_notifications();
```

**Expected Result:**
```json
{
  "success": true,
  "notifications_due": 0,  // or number of notifications ready to send
  "triggered_at": "2025-10-14T...",
  "response_id": 12345
}
```

**If you see error:** "Configuration missing" → Go back and set database settings (Step 1)

### Step 3: Check Edge Function Was Called

1. Go to: **Supabase Dashboard → Edge Functions → sendScheduledNotifications**
2. Click **Logs** tab
3. You should see a recent log entry showing the function was triggered

## 📧 Create a Test Notification

1. **Login to your CRM**
2. **Go to:** CRM → Notifications
3. **Click:** "Schedule New Notification"
4. **Fill in:**
   - Name: `Test 9 AM Notification`
   - Subject: `Test Email at 9 AM`
   - Body: `Hello {first_name}, this is sent automatically at 9 AM!`
   - Recipient Type: `Custom`
   - Custom Emails: `your-email@example.com`
   - Number of Sends: `1`
   - Interval: `1 day`
   - Start Date: **Tomorrow's date**
   - Active: **✅ Checked**
5. **Click:** "Schedule Notification"

## ⏰ What Happens Next

### Tomorrow at 9:00 AM UTC:

1. **pg_cron** triggers `trigger_daily_notifications()`
2. **Function** calls `sendScheduledNotifications` edge function via HTTP
3. **Edge function** fetches your notification and sends email via Resend
4. **Email delivered** to your inbox
5. **History logged** in `notification_history` table
6. **Status updated** - notification marked as completed

## 🔍 Monitor Execution

### Check Cron Run History

```sql
SELECT 
  runid,
  status,
  start_time,
  end_time,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-notification-processor')
ORDER BY start_time DESC 
LIMIT 5;
```

### Check Sent Notifications

```sql
SELECT 
  sn.name,
  nh.recipient_email,
  nh.sent_at,
  nh.status
FROM notification_history nh
JOIN scheduled_notifications sn ON sn.notification_id = nh.notification_id
ORDER BY nh.sent_at DESC
LIMIT 10;
```

## 🕐 Timezone Reference

The cron runs at **9:00 AM UTC**. Here's what that means in other timezones:

| Location | Time |
|----------|------|
| **UTC** | 9:00 AM |
| New York (EST) | 4:00 AM (5:00 AM in winter) |
| Los Angeles (PST) | 1:00 AM (2:00 AM in winter) |
| London (GMT) | 9:00 AM (10:00 AM in summer) |
| India (IST) | 2:30 PM |
| Sydney (AEST) | 7:00 PM (8:00 PM in summer) |

### To Change the Time

```sql
-- Example: Change to 2:00 PM UTC
SELECT cron.unschedule('daily-notification-processor');
SELECT cron.schedule(
  'daily-notification-processor',
  '0 14 * * *',  -- 14 = 2 PM in 24-hour format
  $$SELECT trigger_daily_notifications()$$
);
```

## 🎉 Success Checklist

- [ ] Database settings configured (app.supabase_url + app.service_role_key)
- [ ] Cron job verified in cron.job table
- [ ] Manual test of trigger_daily_notifications() successful
- [ ] Test notification created with tomorrow's start date
- [ ] Waited until 9 AM UTC (or manually triggered for immediate test)
- [ ] Email received in inbox
- [ ] Verified entry in notification_history table

## 📚 Documentation

- **Complete Guide:** `DAILY_NOTIFICATION_CRON_SETUP.md`
- **All Options:** `NOTIFICATION_SCHEDULER_SETUP.md`
- **Troubleshooting:** See "Troubleshooting" section in DAILY_NOTIFICATION_CRON_SETUP.md

## 🆘 Quick Troubleshooting

**Problem:** Cron not running  
**Solution:** Check if pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`

**Problem:** "Configuration missing" error  
**Solution:** Set database config variables (see Required step above)

**Problem:** No emails sent  
**Solution:** Check RESEND_API_KEY is set in Edge Functions secrets

**Problem:** Want to run immediately without waiting for 9 AM  
**Solution:** Run manually: `SELECT trigger_daily_notifications();`

---

## 🚀 You're All Set!

Your notification system will now **automatically check and send scheduled emails every day at 9:00 AM UTC**. No manual intervention required! 🎊
