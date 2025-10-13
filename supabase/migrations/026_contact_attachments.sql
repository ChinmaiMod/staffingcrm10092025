-- ============================================
-- Contact Attachments metadata table
-- ============================================

CREATE TABLE IF NOT EXISTS contact_attachments (
  attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  business_id uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  content_type text,
  size_bytes bigint,
  description text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_attachments_contact ON contact_attachments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_attachments_tenant ON contact_attachments(tenant_id);

ALTER TABLE contact_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_attachments_select_tenant" ON contact_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = contact_attachments.tenant_id
    )
  );

CREATE POLICY "contact_attachments_insert_tenant" ON contact_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = contact_attachments.tenant_id
    )
  );

CREATE POLICY "contact_attachments_delete_admin" ON contact_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.tenant_id = contact_attachments.tenant_id
        AND p.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "contact_attachments_update_owner" ON contact_attachments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = contact_attachments.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid() AND p.tenant_id = contact_attachments.tenant_id
    )
  );

COMMENT ON TABLE contact_attachments IS 'Metadata for files uploaded for contacts. Files stored in storage bucket contact-attachments using tenant/contact folders.';
COMMENT ON COLUMN contact_attachments.file_path IS 'Full storage path (e.g., tenant-id/contact-id/uuid-filename).';
COMMENT ON COLUMN contact_attachments.description IS 'Optional description provided during upload.';
