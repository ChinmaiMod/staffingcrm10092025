-- Migration: Create teams and team_members tables
-- Description: Teams can have multiple internal staff members assigned as Lead or Recruiter

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(business_id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.internal_staff(staff_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('LEAD', 'RECRUITER')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_staff_per_team UNIQUE (team_id, staff_id)
);

-- Create unique index for case-insensitive team names per tenant
CREATE UNIQUE INDEX idx_unique_team_name_per_tenant 
ON public.teams(tenant_id, business_id, LOWER(team_name));

-- Create indexes for performance
CREATE INDEX idx_teams_tenant_id ON public.teams(tenant_id);
CREATE INDEX idx_teams_business_id ON public.teams(business_id);
CREATE INDEX idx_teams_is_active ON public.teams(is_active);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_staff_id ON public.team_members(staff_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table

-- Allow users to view teams in their tenant
CREATE POLICY "Users can view teams in their tenant"
ON public.teams
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Allow authenticated users to create teams
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow users to update teams in their tenant
CREATE POLICY "Users can update teams in their tenant"
ON public.teams
FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Allow users to delete teams in their tenant
CREATE POLICY "Users can delete teams in their tenant"
ON public.teams
FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Service role has full access
CREATE POLICY "Service role has full access to teams"
ON public.teams
USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for team_members table

-- Allow users to view team members in their tenant
CREATE POLICY "Users can view team members in their tenant"
ON public.team_members
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.teams 
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Allow authenticated users to add team members
CREATE POLICY "Authenticated users can add team members"
ON public.team_members
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND team_id IN (
    SELECT team_id FROM public.teams 
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Allow users to update team members in their tenant
CREATE POLICY "Users can update team members in their tenant"
ON public.team_members
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM public.teams 
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id FROM public.teams 
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Allow users to delete team members in their tenant
CREATE POLICY "Users can delete team members in their tenant"
ON public.team_members
FOR DELETE
USING (
  team_id IN (
    SELECT team_id FROM public.teams 
    WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Service role has full access
CREATE POLICY "Service role has full access to team members"
ON public.team_members
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments
COMMENT ON TABLE public.teams IS 'Teams with members assigned as Leads or Recruiters';
COMMENT ON TABLE public.team_members IS 'Team membership tracking internal staff assignments';
COMMENT ON COLUMN public.team_members.role IS 'Role in team: LEAD or RECRUITER';
