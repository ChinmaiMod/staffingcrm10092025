-- ============================================
-- PIPELINES SCHEMA - FIXED FOR BIGINT
-- Adds pipelines, pipeline stages, and contact assignments
-- Modified to use bigint for compatibility with existing schema
-- ============================================

-- ============================================
-- PIPELINES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pipelines (
  pipeline_id bigserial PRIMARY KEY,
  tenant_id bigint NOT NULL,
  business_id bigint REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#4F46E5',
  icon text,
  is_default boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- ============================================
-- PIPELINE STAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  stage_id bigserial PRIMARY KEY,
  pipeline_id bigint REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366F1',
  display_order integer DEFAULT 0,
  is_final boolean DEFAULT false,
  automation_rules jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pipeline_id, name)
);

-- ============================================
-- CONTACT PIPELINE ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS contact_pipeline_assignments (
  assignment_id bigserial PRIMARY KEY,
  contact_id bigint REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  pipeline_id bigint REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  stage_id bigint REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_stage_change timestamptz DEFAULT now(),
  notes text,
  UNIQUE(contact_id, pipeline_id)
);

-- ============================================
-- PIPELINE STAGE HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  history_id bigserial PRIMARY KEY,
  assignment_id bigint REFERENCES contact_pipeline_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  from_stage_id bigint REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  to_stage_id bigint REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_business ON pipelines(business_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_default ON pipelines(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(pipeline_id, display_order);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_contact ON contact_pipeline_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_pipeline ON contact_pipeline_assignments(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_contact_pipeline_stage ON contact_pipeline_assignments(stage_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_assignment ON pipeline_stage_history(assignment_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pipelines_updated_at_trigger ON pipelines;
CREATE TRIGGER update_pipelines_updated_at_trigger
  BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_pipelines_updated_at();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at_trigger ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at_trigger
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_pipelines_updated_at();

-- Track stage changes in history
CREATE OR REPLACE FUNCTION track_pipeline_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO pipeline_stage_history (
      assignment_id,
      from_stage_id,
      to_stage_id,
      changed_by,
      changed_at
    ) VALUES (
      NEW.assignment_id,
      OLD.stage_id,
      NEW.stage_id,
      NEW.assigned_by,
      now()
    );
    
    NEW.last_stage_change := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_stage_change_trigger ON contact_pipeline_assignments;
CREATE TRIGGER track_stage_change_trigger
  BEFORE UPDATE ON contact_pipeline_assignments
  FOR EACH ROW
  EXECUTE FUNCTION track_pipeline_stage_change();

-- Ensure only one default pipeline per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE pipelines 
    SET is_default = false 
    WHERE tenant_id = NEW.tenant_id 
      AND pipeline_id != NEW.pipeline_id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_default_pipeline_trigger ON pipelines;
CREATE TRIGGER ensure_default_pipeline_trigger
  BEFORE INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_pipeline();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_pipeline_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - PIPELINES
-- ============================================

DROP POLICY IF EXISTS "pipelines_service_role_all" ON pipelines;
CREATE POLICY "pipelines_service_role_all" ON pipelines
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "pipelines_select_all" ON pipelines;
CREATE POLICY "pipelines_select_all" ON pipelines
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "pipelines_insert_all" ON pipelines;
CREATE POLICY "pipelines_insert_all" ON pipelines
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pipelines_update_all" ON pipelines;
CREATE POLICY "pipelines_update_all" ON pipelines
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pipelines_delete_all" ON pipelines;
CREATE POLICY "pipelines_delete_all" ON pipelines
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS POLICIES - PIPELINE STAGES
-- ============================================

DROP POLICY IF EXISTS "pipeline_stages_service_role_all" ON pipeline_stages;
CREATE POLICY "pipeline_stages_service_role_all" ON pipeline_stages
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "pipeline_stages_select_all" ON pipeline_stages;
CREATE POLICY "pipeline_stages_select_all" ON pipeline_stages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "pipeline_stages_insert_all" ON pipeline_stages;
CREATE POLICY "pipeline_stages_insert_all" ON pipeline_stages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pipeline_stages_update_all" ON pipeline_stages;
CREATE POLICY "pipeline_stages_update_all" ON pipeline_stages
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pipeline_stages_delete_all" ON pipeline_stages;
CREATE POLICY "pipeline_stages_delete_all" ON pipeline_stages
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS POLICIES - CONTACT PIPELINE ASSIGNMENTS
-- ============================================

DROP POLICY IF EXISTS "contact_pipeline_service_role_all" ON contact_pipeline_assignments;
CREATE POLICY "contact_pipeline_service_role_all" ON contact_pipeline_assignments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "contact_pipeline_select_all" ON contact_pipeline_assignments;
CREATE POLICY "contact_pipeline_select_all" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

DROP POLICY IF EXISTS "contact_pipeline_insert_all" ON contact_pipeline_assignments;
CREATE POLICY "contact_pipeline_insert_all" ON contact_pipeline_assignments
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

DROP POLICY IF EXISTS "contact_pipeline_update_all" ON contact_pipeline_assignments;
CREATE POLICY "contact_pipeline_update_all" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

DROP POLICY IF EXISTS "contact_pipeline_delete_all" ON contact_pipeline_assignments;
CREATE POLICY "contact_pipeline_delete_all" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_pipeline_assignments.contact_id
    )
  );

-- ============================================
-- RLS POLICIES - PIPELINE STAGE HISTORY
-- ============================================

DROP POLICY IF EXISTS "pipeline_history_service_role_all" ON pipeline_stage_history;
CREATE POLICY "pipeline_history_service_role_all" ON pipeline_stage_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "pipeline_history_select_all" ON pipeline_stage_history;
CREATE POLICY "pipeline_history_select_all" ON pipeline_stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contact_pipeline_assignments cpa
      JOIN contacts c ON c.id = cpa.contact_id
      WHERE cpa.assignment_id = pipeline_stage_history.assignment_id
    )
  );

DROP POLICY IF EXISTS "pipeline_history_insert_all" ON pipeline_stage_history;
CREATE POLICY "pipeline_history_insert_all" ON pipeline_stage_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

COMMENT ON TABLE pipelines IS 'Pipelines for managing contact workflows (bigint IDs for compatibility)';
COMMENT ON TABLE pipeline_stages IS 'Stages within each pipeline';
COMMENT ON TABLE contact_pipeline_assignments IS 'Links contacts to pipelines with current stage';
COMMENT ON TABLE pipeline_stage_history IS 'Audit trail of pipeline stage changes';
