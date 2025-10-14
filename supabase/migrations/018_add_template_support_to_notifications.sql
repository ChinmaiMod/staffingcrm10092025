-- Migration: Add email template support to scheduled notifications
-- Created: 2025-10-14

-- ============================================
-- Add template_id to scheduled_notifications
-- ============================================
ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL;

-- Add index for template_id
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_template ON scheduled_notifications(template_id);

-- ============================================
-- Update get_notifications_due_for_sending function
-- ============================================
CREATE OR REPLACE FUNCTION get_notifications_due_for_sending()
RETURNS TABLE (
  notification_id uuid,
  tenant_id uuid,
  business_id uuid,
  name text,
  subject text,
  body text,
  template_id uuid,
  recipient_type text,
  recipient_filters jsonb,
  custom_recipients text[],
  repeat_count integer,
  interval_days integer,
  times_sent integer
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    notification_id,
    tenant_id,
    business_id,
    name,
    subject,
    body,
    template_id,
    recipient_type,
    recipient_filters,
    custom_recipients,
    repeat_count,
    interval_days,
    times_sent
  FROM scheduled_notifications
  WHERE is_active = true
    AND is_completed = false
    AND next_send_date <= now()
  ORDER BY next_send_date ASC;
$$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON COLUMN scheduled_notifications.template_id IS 'Optional reference to email template (overrides subject/body if set)';

