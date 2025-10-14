-- Migration: Create email_templates table and add support to scheduled_notifications
-- Created: 2025-10-14

-- ============================================
-- Email Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
  template_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_tenant_name 
ON email_templates(tenant_id, lower(name));

-- ============================================
-- Add template_id to scheduled_notifications
-- ============================================
ALTER TABLE scheduled_notifications
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES email_templates(template_id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_template ON scheduled_notifications(template_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: email_templates
-- ============================================

-- Users can view email templates in their tenant
CREATE POLICY "email_templates_select_tenant" ON email_templates
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can insert email templates
CREATE POLICY "email_templates_insert_admin" ON email_templates
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Admins can update email templates in their tenant
CREATE POLICY "email_templates_update_admin" ON email_templates
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Admins can delete email templates in their tenant
CREATE POLICY "email_templates_delete_admin" ON email_templates
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'CEO', 'SUPER_ADMIN')
    )
  );

-- Service role has full access
CREATE POLICY "service_role_all_email_templates" ON email_templates 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- Update get_notifications_due_for_sending function
-- ============================================
DROP FUNCTION IF EXISTS get_notifications_due_for_sending();

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_notifications_due_for_sending() TO service_role;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE email_templates IS 'Reusable email templates with placeholder support';
COMMENT ON COLUMN email_templates.body_text IS 'Plain text version of email body';
COMMENT ON COLUMN email_templates.body_html IS 'HTML version of email body';
COMMENT ON COLUMN scheduled_notifications.template_id IS 'Optional reference to email template (overrides subject/body if set)';

