-- Migration: Set up automated daily notification processing at 9 AM
-- Created: 2025-10-14
-- This sets up pg_cron to automatically trigger notifications every day at 9:00 AM

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================

-- Enable pg_cron for scheduling (available on Supabase Pro plan and above)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for making HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- HELPER FUNCTION
-- ============================================

-- Function to trigger the notification processor edge function
CREATE OR REPLACE FUNCTION trigger_daily_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_result jsonb;
  v_response_id bigint;
  v_due_count int;
BEGIN
  -- Log the execution
  RAISE NOTICE '🔔 Daily notification check triggered at %', now();
  
  -- Count notifications due for sending
  SELECT COUNT(*) INTO v_due_count
  FROM scheduled_notifications
  WHERE is_active = true
    AND is_completed = false
    AND next_send_date <= now();
  
  RAISE NOTICE '📊 Found % notification(s) due for sending', v_due_count;
  
  -- Get Supabase configuration from environment
  -- Note: These need to be set in Supabase Dashboard → Project Settings → Database → Settings
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Service Role Key not configured. Set app.supabase_url and app.service_role_key';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuration missing',
      'message', 'Set app.supabase_url and app.service_role_key in database settings'
    );
  END IF;
  
  -- Call the edge function via pg_net
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/sendScheduledNotifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  ) INTO v_response_id;
  
  RAISE NOTICE '✅ Edge function triggered, response ID: %', v_response_id;
  
  -- Return success info
  RETURN jsonb_build_object(
    'success', true,
    'notifications_due', v_due_count,
    'triggered_at', now(),
    'response_id', v_response_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in trigger_daily_notifications: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION trigger_daily_notifications() IS 'Triggers the sendScheduledNotifications edge function via pg_net. Called by pg_cron daily at 9 AM.';

-- ============================================
-- SCHEDULE THE CRON JOB
-- ============================================

-- Unschedule existing job if it exists (to avoid duplicates)
SELECT cron.unschedule('daily-notification-processor')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-notification-processor'
);

-- Schedule the cron job to run every day at 9:00 AM (UTC)
-- Cron format: minute hour day month weekday
-- '0 9 * * *' = At 9:00 AM every day
SELECT cron.schedule(
  'daily-notification-processor',  -- Job name
  '0 9 * * *',                     -- Schedule: 9:00 AM daily
  $$SELECT trigger_daily_notifications()$$  -- SQL command to execute
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Query to verify the cron job is scheduled
-- Run this to check: SELECT * FROM cron.job WHERE jobname = 'daily-notification-processor';

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for daily notification processing';
COMMENT ON EXTENSION pg_net IS 'HTTP client for PostgreSQL - used to call edge functions from cron jobs';

-- ============================================
-- CONFIGURATION INSTRUCTIONS
-- ============================================

-- IMPORTANT: After running this migration, you must configure these settings:
--
-- 1. In Supabase Dashboard → Project Settings → Database → Settings
--    Add these custom postgres configurations:
--    
--    app.supabase_url = https://yvcsxadahzrxuptcgtkg.supabase.co
--    app.service_role_key = your_service_role_key_here
--
-- 2. Or set them via SQL:
--    
--    ALTER DATABASE postgres SET app.supabase_url = 'https://yvcsxadahzrxuptcgtkg.supabase.co';
--    ALTER DATABASE postgres SET app.service_role_key = 'your_service_role_key_here';
--
-- 3. Verify the cron job is scheduled:
--    
--    SELECT * FROM cron.job WHERE jobname = 'daily-notification-processor';
--
-- 4. Manually test the function:
--    
--    SELECT trigger_daily_notifications();
--
-- 5. View cron job execution history:
--    
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-notification-processor')
--    ORDER BY start_time DESC LIMIT 10;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on the trigger function
GRANT EXECUTE ON FUNCTION trigger_daily_notifications() TO postgres;

-- Note: pg_cron runs as the postgres user, so permissions are already in place
