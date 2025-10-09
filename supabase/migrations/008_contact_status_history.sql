-- ============================================
-- Contact Status History
-- Tracks all status changes with mandatory remarks
-- ============================================

-- Create status history table
CREATE TABLE IF NOT EXISTS contact_status_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  old_status text,
  new_status text NOT NULL,
  remarks text NOT NULL, -- Mandatory remarks for status change
  changed_at timestamptz DEFAULT now()
);

-- Add comment type to contact_comments to differentiate general comments from status changes
ALTER TABLE contact_comments 
ADD COLUMN IF NOT EXISTS comment_type text DEFAULT 'GENERAL' CHECK (comment_type IN ('GENERAL', 'STATUS_CHANGE'));

ALTER TABLE contact_comments
ADD COLUMN IF NOT EXISTS related_status_history_id uuid REFERENCES contact_status_history(history_id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_status_history_contact ON contact_status_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON contact_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_comments_type ON contact_comments(comment_type);

-- Enable RLS
ALTER TABLE contact_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status history
CREATE POLICY "status_history_select_tenant" ON contact_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.contact_id = contact_status_history.contact_id
        AND contacts.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "status_history_insert_member" ON contact_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.contact_id = contact_status_history.contact_id
        AND contacts.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Function to automatically create status history entry
CREATE OR REPLACE FUNCTION log_contact_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Note: In real implementation, remarks should come from the application
    -- This is a fallback for direct database updates
    INSERT INTO contact_status_history (
      contact_id,
      changed_by,
      old_status,
      new_status,
      remarks
    ) VALUES (
      NEW.contact_id,
      auth.uid(),
      OLD.status,
      NEW.status,
      COALESCE(NEW.remarks, 'Status changed via database update')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status change logging
-- Note: This trigger should be disabled if the application handles status history explicitly
CREATE TRIGGER trigger_log_contact_status_change
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION log_contact_status_change();

-- Comment on usage
COMMENT ON TABLE contact_status_history IS 'Tracks all status changes for contacts with mandatory remarks explaining the change';
COMMENT ON COLUMN contact_status_history.remarks IS 'Mandatory field - must explain reason for status change';
COMMENT ON COLUMN contact_comments.comment_type IS 'GENERAL for regular comments, STATUS_CHANGE for status-related remarks';
COMMENT ON COLUMN contact_comments.related_status_history_id IS 'Links comment to a specific status change event';
