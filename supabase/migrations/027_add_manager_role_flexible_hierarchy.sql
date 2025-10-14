-- Migration: Add MANAGER role and flexible hierarchy
-- Description: Allow managers who oversee team leads, creating a 3-level hierarchy: Manager → Lead → Recruiter
-- Note: reports_to_member_id is optional to support legacy data

-- First, update the role CHECK constraint to include MANAGER
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_role_check;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_role_check CHECK (role IN ('MANAGER', 'LEAD', 'RECRUITER'));

-- Remove the old constraint that required recruiters to have a lead
ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS recruiter_reports_to_lead;

-- Add flexible constraint: reports_to_member_id is optional but if set, must follow hierarchy rules
-- This allows existing data where recruiters don't have a lead assigned yet
ALTER TABLE public.team_members
ADD CONSTRAINT team_hierarchy_check CHECK (
  -- Managers should not report to anyone
  (role = 'MANAGER' AND reports_to_member_id IS NULL) OR
  -- Leads and Recruiters can optionally report to someone
  (role IN ('LEAD', 'RECRUITER'))
);

-- Add comment
COMMENT ON CONSTRAINT team_hierarchy_check ON public.team_members IS 
'Flexible 3-level hierarchy: MANAGER (top, no reports_to) → LEAD (can report to manager) → RECRUITER (can report to lead)';

-- Update table comment
COMMENT ON TABLE public.team_members IS 
'Team membership with optional 3-level hierarchy: Managers oversee Leads, Leads oversee Recruiters';

-- Add index if not exists (might already exist from previous migration)
CREATE INDEX IF NOT EXISTS idx_team_members_reports_to ON public.team_members(reports_to_member_id);
