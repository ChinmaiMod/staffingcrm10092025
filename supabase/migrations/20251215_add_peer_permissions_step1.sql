-- ============================================
-- FEATURE: Add Peer-Level Permissions - Step 1
-- Add columns and create peer function
-- ============================================

-- STEP 1: Add peer permission columns to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS can_view_peer_records boolean DEFAULT false;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS can_edit_peer_records boolean DEFAULT false;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS can_delete_peer_records boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN user_roles.can_view_peer_records IS 'Allows viewing records created by users at the same role level';
COMMENT ON COLUMN user_roles.can_edit_peer_records IS 'Allows editing records created by users at the same role level';
COMMENT ON COLUMN user_roles.can_delete_peer_records IS 'Allows deleting records created by users at the same role level';

-- STEP 2: Create function to get peer user IDs (same role_level in same tenant)
CREATE OR REPLACE FUNCTION rbac_peer_profile_ids(p_user_id uuid, p_tenant_id uuid)
RETURNS TABLE(user_id uuid) AS $$
DECLARE
  v_role_level integer;
BEGIN
  -- Get the current user's role level
  SELECT ur.role_level 
  INTO v_role_level
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN user_roles ur ON ur.role_id = ura.role_id
  WHERE p.id = p_user_id
    AND p.tenant_id = p_tenant_id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > now())
  LIMIT 1;
  
  -- Return all users at the same role level in the same tenant (excluding self)
  RETURN QUERY
  SELECT p.id
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN user_roles ur ON ur.role_id = ura.role_id
  WHERE p.tenant_id = p_tenant_id
    AND ur.role_level = v_role_level
    AND p.id != p_user_id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > now());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rbac_peer_profile_ids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rbac_peer_profile_ids(uuid, uuid) TO anon;
