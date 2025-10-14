-- Migration: Add lead-to-recruiter relationship in team_members table
-- Description: Allows recruiters to be linked to a specific team lead for better hierarchy

-- Add column to link recruiter to their lead
ALTER TABLE public.team_members
ADD COLUMN reports_to_member_id UUID REFERENCES public.team_members(member_id) ON DELETE SET NULL;

-- Add constraint: Only recruiters can have a reports_to_member_id
ALTER TABLE public.team_members
ADD CONSTRAINT recruiter_reports_to_lead CHECK (
  (role = 'RECRUITER' AND reports_to_member_id IS NOT NULL) OR
  (role = 'LEAD' AND reports_to_member_id IS NULL) OR
  reports_to_member_id IS NULL
);

-- Add index for performance on reporting relationships
CREATE INDEX idx_team_members_reports_to ON public.team_members(reports_to_member_id);

-- Add comment
COMMENT ON COLUMN public.team_members.reports_to_member_id IS 'For recruiters: the member_id of the lead they report to';

-- Note: This allows:
-- 1. Leads have reports_to_member_id = NULL
-- 2. Recruiters can have reports_to_member_id pointing to a lead's member_id
-- 3. Creates a clear reporting hierarchy within each team
