-- Migration: Add scheduled notification support with repeat count and intervals
-- Created: 2025-10-14

-- ============================================
-- Scheduled Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  business_id uuid REFERENCES businesses(business_id) ON DELETE SET NULL,
  
  -- Notification details
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  
  -- Recipient configuration
  recipient_type text NOT NULL CHECK (recipient_type IN ('CONTACTS', 'INTERNAL_STAFF', 'CUSTOM')),
  recipient_filters jsonb, -- Filters to select recipients (e.g., {type: 'IT_CANDIDATE', status: 'Initial Contact'})
  custom_recipients text[], -- Array of email addresses for custom recipients
  
  -- Scheduling configuration
  repeat_count integer NOT NULL DEFAULT 1 CHECK (repeat_count >= 1 AND repeat_count <= 5),
  interval_days integer NOT NULL DEFAULT 1 CHECK (interval_days >= 1 AND interval_days <= 5),
  start_date timestamptz DEFAULT now(),
  next_send_date timestamptz,
  
  -- Status tracking
  times_sent integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  
  -- Metadata
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Notification History Table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES scheduled_notifications(notification_id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  
  -- Send details
  sent_at timestamptz DEFAULT now(),
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_id uuid, -- Reference to contact_id or staff_id
  recipient_source text CHECK (recipient_source IN ('CONTACTS', 'INTERNAL_STAFF', 'CUSTOM')),
  
  -- Email details
  subject text NOT NULL,
  body text NOT NULL,
  
  -- Status
  status text NOT NULL CHECK (status IN ('SENT', 'FAILED', 'PENDING')) DEFAULT 'PENDING',
  error_message text,
  resend_email_id text, -- ID from Resend API
  
  -- Metadata
  sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_tenant ON scheduled_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_business ON scheduled_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_next_send ON scheduled_notifications(next_send_date) WHERE is_active = true AND is_completed = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(is_active, is_completed);

CREATE INDEX IF NOT EXISTS idx_notification_history_notification ON notification_history(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_tenant ON notification_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON notification_history(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_scheduled_notifications_updated_at BEFORE UPDATE ON scheduled_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: scheduled_notifications
-- ============================================

-- Users can view scheduled notifications in their tenant
CREATE POLICY "scheduled_notifications_select_tenant" ON scheduled_notifications
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can insert scheduled notifications
CREATE POLICY "scheduled_notifications_insert_admin" ON scheduled_notifications
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Admins can update scheduled notifications in their tenant
CREATE POLICY "scheduled_notifications_update_admin" ON scheduled_notifications
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Admins can delete scheduled notifications in their tenant
CREATE POLICY "scheduled_notifications_delete_admin" ON scheduled_notifications
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Service role has full access
CREATE POLICY "service_role_all_scheduled_notifications" ON scheduled_notifications 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES: notification_history
-- ============================================

-- Users can view notification history in their tenant
CREATE POLICY "notification_history_select_tenant" ON notification_history
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role can insert notification history
CREATE POLICY "service_role_insert_notification_history" ON notification_history
  FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Service role has full access
CREATE POLICY "service_role_all_notification_history" ON notification_history 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get next notification due for sending
CREATE OR REPLACE FUNCTION get_notifications_due_for_sending()
RETURNS TABLE (
  notification_id uuid,
  tenant_id uuid,
  business_id uuid,
  name text,
  subject text,
  body text,
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

-- Function to update notification after sending
CREATE OR REPLACE FUNCTION update_notification_after_send(
  p_notification_id uuid,
  p_success_count integer,
  p_fail_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_times_sent integer;
  v_repeat_count integer;
  v_interval_days integer;
BEGIN
  -- Get current values
  SELECT times_sent, repeat_count, interval_days
  INTO v_times_sent, v_repeat_count, v_interval_days
  FROM scheduled_notifications
  WHERE notification_id = p_notification_id;
  
  -- Increment times_sent
  v_times_sent := v_times_sent + 1;
  
  -- Update the notification
  IF v_times_sent >= v_repeat_count THEN
    -- Mark as completed if all sends are done
    UPDATE scheduled_notifications
    SET times_sent = v_times_sent,
        is_completed = true,
        next_send_date = NULL,
        updated_at = now()
    WHERE notification_id = p_notification_id;
  ELSE
    -- Schedule next send
    UPDATE scheduled_notifications
    SET times_sent = v_times_sent,
        next_send_date = now() + (v_interval_days || ' days')::interval,
        updated_at = now()
    WHERE notification_id = p_notification_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notifications_due_for_sending() TO service_role;
GRANT EXECUTE ON FUNCTION update_notification_after_send(uuid, integer, integer) TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE scheduled_notifications IS 'Stores notification configurations with repeat scheduling';
COMMENT ON TABLE notification_history IS 'Audit log of all sent notifications';
COMMENT ON COLUMN scheduled_notifications.repeat_count IS 'Number of times to send notification (1-5)';
COMMENT ON COLUMN scheduled_notifications.interval_days IS 'Days between each notification send (1-5)';
COMMENT ON COLUMN scheduled_notifications.recipient_filters IS 'JSON filters to select recipients from contacts/internal_staff tables';
COMMENT ON FUNCTION get_notifications_due_for_sending() IS 'Returns all active notifications that are due for sending';
COMMENT ON FUNCTION update_notification_after_send(uuid, integer, integer) IS 'Updates notification status after sending and schedules next send';
