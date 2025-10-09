-- ============================================
-- PIPELINES SCHEMA
-- Adds pipelines, pipeline stages, and contact assignments
-- Run this after 009_fix_registration_rls.sql
-- ============================================

-- ============================================
-- PIPELINES TABLE
-- Represents different pipelines (e.g., "Recruitment", "Onboarding", "Sales")
-- ============================================

CREATE TABLE IF NOT EXISTS pipelines (
  pipeline_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#4F46E5', -- Hex color for UI display
  icon text, -- Optional icon name/emoji
  is_default boolean DEFAULT false, -- One default pipeline per tenant
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
-- Stages within each pipeline (e.g., "Lead", "Qualified", "Contacted", "Placed")
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  stage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366F1', -- Hex color for kanban column
  display_order integer DEFAULT 0,
  is_final boolean DEFAULT false, -- Mark final/completed stages
  automation_rules jsonb, -- Optional: automation rules when contact enters this stage
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pipeline_id, name)
);

-- ============================================
-- CONTACT PIPELINE ASSIGNMENTS
-- Links contacts to pipelines with current stage
-- ============================================

CREATE TABLE IF NOT EXISTS contact_pipeline_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(contact_id) ON DELETE CASCADE NOT NULL,
  pipeline_id uuid REFERENCES pipelines(pipeline_id) ON DELETE CASCADE NOT NULL,
  stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_stage_change timestamptz DEFAULT now(),
  notes text,
  UNIQUE(contact_id, pipeline_id) -- One assignment per contact per pipeline
);

-- ============================================
-- PIPELINE STAGE HISTORY
-- Track when contacts move between stages
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stage_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES contact_pipeline_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  from_stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  to_stage_id uuid REFERENCES pipeline_stages(stage_id) ON DELETE SET NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  notes text,
  duration_in_previous_stage interval GENERATED ALWAYS AS (
    changed_at - LAG(changed_at) OVER (PARTITION BY assignment_id ORDER BY changed_at)
  ) STORED
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX idx_pipelines_is_default ON pipelines(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(pipeline_id, display_order);
CREATE INDEX idx_contact_pipeline_contact ON contact_pipeline_assignments(contact_id);
CREATE INDEX idx_contact_pipeline_pipeline ON contact_pipeline_assignments(pipeline_id);
CREATE INDEX idx_contact_pipeline_stage ON contact_pipeline_assignments(stage_id);
CREATE INDEX idx_pipeline_history_assignment ON pipeline_stage_history(assignment_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_pipelines_updated_at 
  BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_stages_updated_at 
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Track stage changes in history
CREATE OR REPLACE FUNCTION track_pipeline_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if stage actually changed
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
      NEW.assigned_by, -- Use assigned_by as changed_by for now
      now()
    );
    
    -- Update last_stage_change timestamp
    NEW.last_stage_change := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_stage_change_trigger
  BEFORE UPDATE ON contact_pipeline_assignments
  FOR EACH ROW
  EXECUTE FUNCTION track_pipeline_stage_change();

-- Ensure only one default pipeline per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default pipelines for this tenant
    UPDATE pipelines 
    SET is_default = false 
    WHERE tenant_id = NEW.tenant_id 
      AND pipeline_id != NEW.pipeline_id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Service role can do anything
CREATE POLICY "pipelines_service_role_all" ON pipelines
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant members can view pipelines
CREATE POLICY "pipelines_select_tenant" ON pipelines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
    )
  );

-- Admins can insert pipelines
CREATE POLICY "pipelines_insert_admin" ON pipelines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- Admins can update pipelines
CREATE POLICY "pipelines_update_admin" ON pipelines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- Admins can delete pipelines
CREATE POLICY "pipelines_delete_admin" ON pipelines
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = pipelines.tenant_id
      AND profiles.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - PIPELINE STAGES
-- ============================================

-- Service role can do anything
CREATE POLICY "pipeline_stages_service_role_all" ON pipeline_stages
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant members can view stages
CREATE POLICY "pipeline_stages_select_tenant" ON pipeline_stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
    )
  );

-- Admins can insert stages
CREATE POLICY "pipeline_stages_insert_admin" ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- Admins can update stages
CREATE POLICY "pipeline_stages_update_admin" ON pipeline_stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- Admins can delete stages
CREATE POLICY "pipeline_stages_delete_admin" ON pipeline_stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines p
      JOIN profiles prof ON prof.tenant_id = p.tenant_id
      WHERE p.pipeline_id = pipeline_stages.pipeline_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - CONTACT PIPELINE ASSIGNMENTS
-- ============================================

-- Service role can do anything
CREATE POLICY "contact_pipeline_service_role_all" ON contact_pipeline_assignments
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant members can view assignments
CREATE POLICY "contact_pipeline_select_tenant" ON contact_pipeline_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

-- Tenant members can insert assignments
CREATE POLICY "contact_pipeline_insert_member" ON contact_pipeline_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

-- Tenant members can update assignments (move stages)
CREATE POLICY "contact_pipeline_update_member" ON contact_pipeline_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
    )
  );

-- Admins can delete assignments
CREATE POLICY "contact_pipeline_delete_admin" ON contact_pipeline_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE c.contact_id = contact_pipeline_assignments.contact_id
      AND prof.id = auth.uid()
      AND prof.role IN ('tenant_admin', 'ADMIN')
    )
  );

-- ============================================
-- RLS POLICIES - PIPELINE STAGE HISTORY
-- ============================================

-- Service role can do anything
CREATE POLICY "pipeline_history_service_role_all" ON pipeline_stage_history
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Tenant members can view history
CREATE POLICY "pipeline_history_select_tenant" ON pipeline_stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contact_pipeline_assignments cpa
      JOIN contacts c ON c.contact_id = cpa.contact_id
      JOIN profiles prof ON prof.tenant_id = c.tenant_id
      WHERE cpa.assignment_id = pipeline_stage_history.assignment_id
      AND prof.id = auth.uid()
    )
  );

-- System inserts history via trigger (users don't insert directly)
CREATE POLICY "pipeline_history_insert_system" ON pipeline_stage_history
  FOR INSERT
  WITH CHECK (true); -- Allow trigger to insert

-- ============================================
-- SEED DATA - DEFAULT PIPELINES
-- ============================================

-- Note: These will be inserted per tenant when they first access the pipeline feature
-- Or can be seeded via application logic

-- Example: Recruitment Pipeline with stages
-- INSERT INTO pipelines (tenant_id, name, description, color, is_default, display_order)
-- VALUES 
--   ('TENANT_ID_HERE', 'Recruitment', 'Main candidate recruitment pipeline', '#4F46E5', true, 1);

-- INSERT INTO pipeline_stages (pipeline_id, name, description, color, display_order, is_final)
-- VALUES
--   ('PIPELINE_ID_HERE', 'Lead', 'Initial contact made', '#6366F1', 1, false),
--   ('PIPELINE_ID_HERE', 'Qualified', 'Candidate qualified and interested', '#8B5CF6', 2, false),
--   ('PIPELINE_ID_HERE', 'Resume Prepared', 'Resume has been prepared', '#A855F7', 3, false),
--   ('PIPELINE_ID_HERE', 'Marketing', 'Actively marketing to clients', '#C026D3', 4, false),
--   ('PIPELINE_ID_HERE', 'Interview', 'Candidate in interview process', '#E879F9', 5, false),
--   ('PIPELINE_ID_HERE', 'Offer', 'Offer extended to candidate', '#F0ABFC', 6, false),
--   ('PIPELINE_ID_HERE', 'Placed', 'Candidate successfully placed', '#10B981', 7, true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get pipeline statistics
CREATE OR REPLACE FUNCTION get_pipeline_stats(p_pipeline_id uuid)
RETURNS TABLE (
  stage_id uuid,
  stage_name text,
  contact_count bigint,
  avg_time_in_stage interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.stage_id,
    ps.name as stage_name,
    COUNT(cpa.assignment_id) as contact_count,
    AVG(now() - cpa.last_stage_change) as avg_time_in_stage
  FROM pipeline_stages ps
  LEFT JOIN contact_pipeline_assignments cpa ON cpa.stage_id = ps.stage_id
  WHERE ps.pipeline_id = p_pipeline_id
  GROUP BY ps.stage_id, ps.name, ps.display_order
  ORDER BY ps.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Move contact to different stage
CREATE OR REPLACE FUNCTION move_contact_to_stage(
  p_contact_id uuid,
  p_pipeline_id uuid,
  p_new_stage_id uuid,
  p_changed_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Get or create assignment
  SELECT assignment_id INTO v_assignment_id
  FROM contact_pipeline_assignments
  WHERE contact_id = p_contact_id AND pipeline_id = p_pipeline_id;
  
  IF v_assignment_id IS NULL THEN
    -- Create new assignment
    INSERT INTO contact_pipeline_assignments (
      contact_id, pipeline_id, stage_id, assigned_by, notes
    ) VALUES (
      p_contact_id, p_pipeline_id, p_new_stage_id, p_changed_by, p_notes
    )
    RETURNING assignment_id INTO v_assignment_id;
  ELSE
    -- Update existing assignment
    UPDATE contact_pipeline_assignments
    SET stage_id = p_new_stage_id,
        assigned_by = p_changed_by,
        notes = COALESCE(p_notes, notes)
    WHERE assignment_id = v_assignment_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END
-- ============================================
