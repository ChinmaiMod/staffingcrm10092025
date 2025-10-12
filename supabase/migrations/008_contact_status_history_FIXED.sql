-- ============================================
-- CONTACT STATUS HISTORY
-- Tracks status changes for contacts with timestamps
-- Modified to use bigint IDs to match existing schema
-- ============================================

CREATE TABLE IF NOT EXISTS contact_status_history (
  history_id bigserial PRIMARY KEY,
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by bigint REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Index for efficient lookups
CREATE INDEX idx_contact_status_history_contact ON contact_status_history(contact_id);
CREATE INDEX idx_contact_status_history_changed_at ON contact_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE contact_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "contact_status_history_service_role_all" ON contact_status_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Users can view status history for contacts in their tenant
CREATE POLICY "contact_status_history_select_tenant" ON contact_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN users u ON u.tenant_id = c.tenant_id
      WHERE c.id = contact_status_history.contact_id
      AND u.id = auth.uid()::bigint
    )
  );

-- Users can insert status history when updating contacts
CREATE POLICY "contact_status_history_insert_member" ON contact_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN users u ON u.tenant_id = c.tenant_id
      WHERE c.id = contact_status_history.contact_id
      AND u.id = auth.uid()::bigint
    )
  );

COMMENT ON TABLE contact_status_history IS 'Tracks all workflow status changes for contacts with audit trail';
