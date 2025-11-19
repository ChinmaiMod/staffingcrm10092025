-- Migration: Ensure trigger_daily_notifications uses proper Supabase auth headers
-- Created: 2025-11-19

-- This migration recreates the trigger_daily_notifications() helper so that
-- pg_net sends both the Authorization bearer token and the apikey header.
-- Supabase Edge Functions expect both headers when authenticated via the
-- service role key; omitting apikey results in 401 responses.

CREATE OR REPLACE FUNCTION trigger_daily_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_due_count integer;
  v_request_id bigint;
  v_headers jsonb;
BEGIN
  RAISE NOTICE '🔔 Daily notification check triggered at %', now();

  SELECT COUNT(*) INTO v_due_count
  FROM scheduled_notifications
  WHERE is_active = true
    AND is_completed = false
    AND next_send_date <= now();

  RAISE NOTICE '📊 Found % notification(s) due for sending', v_due_count;

  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Service Role Key not configured. Set app.supabase_url and app.service_role_key.';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuration missing',
      'message', 'Set app.supabase_url and app.service_role_key in database settings'
    );
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_role_key,
    'apikey', v_service_role_key
  );

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/sendScheduledNotifications',
    headers := v_headers,
    body := '{}'::jsonb
  ) INTO v_request_id;

  IF v_request_id IS NULL THEN
    RAISE WARNING 'pg_net http_post call did not return a request id';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'pg_net request failed to enqueue'
    );
  END IF;

  RAISE NOTICE '✅ Edge function request queued (request_id=%)', v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'notifications_due', v_due_count,
    'triggered_at', now(),
    'response_id', v_request_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in trigger_daily_notifications: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION trigger_daily_notifications() IS 'Triggers the sendScheduledNotifications edge function via pg_net. Called by pg_cron daily at 9 AM, sends Authorization and apikey headers.';
