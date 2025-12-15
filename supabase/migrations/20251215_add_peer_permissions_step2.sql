-- ============================================
-- FEATURE: Add Peer-Level Permissions - Step 2
-- Rebuild view and all dependent policies
-- ============================================

-- STEP 1: Drop all dependent policies first (must drop in order due to dependencies)
DROP POLICY IF EXISTS "contacts_select_rbac" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_rbac" ON contacts;
DROP POLICY IF EXISTS "contacts_update_rbac" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_rbac" ON contacts;

DROP POLICY IF EXISTS "clients_select_rbac" ON clients;
DROP POLICY IF EXISTS "clients_insert_rbac" ON clients;
DROP POLICY IF EXISTS "clients_update_rbac" ON clients;
DROP POLICY IF EXISTS "clients_delete_rbac" ON clients;

DROP POLICY IF EXISTS "job_orders_select_rbac" ON job_orders;
DROP POLICY IF EXISTS "job_orders_insert_rbac" ON job_orders;
DROP POLICY IF EXISTS "job_orders_update_rbac" ON job_orders;
DROP POLICY IF EXISTS "job_orders_delete_rbac" ON job_orders;

DROP POLICY IF EXISTS "pipelines_select_rbac" ON pipelines;
DROP POLICY IF EXISTS "pipelines_insert_rbac" ON pipelines;
DROP POLICY IF EXISTS "pipelines_update_rbac" ON pipelines;
DROP POLICY IF EXISTS "pipelines_delete_rbac" ON pipelines;

-- STEP 2: Drop and recreate the view with new peer columns
DROP VIEW IF EXISTS user_permissions;

CREATE VIEW user_permissions AS
SELECT 
  p.id AS user_id,
  p.tenant_id,
  ur.role_id,
  ur.role_code,
  ur.role_name,
  ur.role_level,
  ur.can_create_records,
  ur.can_edit_own_records,
  ur.can_edit_subordinate_records,
  ur.can_edit_peer_records,
  ur.can_edit_all_records,
  ur.can_delete_own_records,
  ur.can_delete_subordinate_records,
  ur.can_delete_peer_records,
  ur.can_delete_all_records,
  ur.can_view_own_records,
  ur.can_view_subordinate_records,
  ur.can_view_peer_records,
  ur.can_view_all_records,
  ur.can_assign_roles,
  ur.can_manage_users,
  ur.can_manage_businesses,
  ur.can_manage_roles
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN user_roles ur ON ur.role_id = ura.role_id
WHERE ura.is_active = true 
  AND (ura.valid_until IS NULL OR ura.valid_until > now());

-- STEP 3: Recreate all policies with peer support

-- ========== CONTACTS POLICIES ==========
CREATE POLICY "contacts_select_rbac" ON contacts
FOR SELECT USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = contacts.tenant_id
      AND (
        up.can_view_all_records OR
        (up.can_view_own_records AND (contacts.created_by = auth.uid() OR contacts.created_by IS NULL)) OR
        (up.can_view_subordinate_records AND (contacts.created_by IS NULL OR contacts.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), contacts.tenant_id)))) OR
        (up.can_view_peer_records AND contacts.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), contacts.tenant_id)))
      )
  )
);

CREATE POLICY "contacts_insert_rbac" ON contacts
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = contacts.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY "contacts_update_rbac" ON contacts
FOR UPDATE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = contacts.tenant_id
      AND (
        up.can_edit_all_records OR
        (up.can_edit_own_records AND contacts.created_by = auth.uid()) OR
        (up.can_edit_subordinate_records AND contacts.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), contacts.tenant_id))) OR
        (up.can_edit_peer_records AND contacts.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), contacts.tenant_id)))
      )
  )
);

CREATE POLICY "contacts_delete_rbac" ON contacts
FOR DELETE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = contacts.tenant_id
      AND (
        up.can_delete_all_records OR
        (up.can_delete_own_records AND contacts.created_by = auth.uid()) OR
        (up.can_delete_subordinate_records AND contacts.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), contacts.tenant_id))) OR
        (up.can_delete_peer_records AND contacts.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), contacts.tenant_id)))
      )
  )
);

-- ========== CLIENTS POLICIES ==========
CREATE POLICY "clients_select_rbac" ON clients
FOR SELECT USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = clients.tenant_id
      AND (
        up.can_view_all_records OR
        (up.can_view_own_records AND (clients.created_by = auth.uid() OR clients.created_by IS NULL)) OR
        (up.can_view_subordinate_records AND (clients.created_by IS NULL OR clients.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), clients.tenant_id)))) OR
        (up.can_view_peer_records AND clients.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), clients.tenant_id)))
      )
  )
);

CREATE POLICY "clients_insert_rbac" ON clients
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = clients.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY "clients_update_rbac" ON clients
FOR UPDATE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = clients.tenant_id
      AND (
        up.can_edit_all_records OR
        (up.can_edit_own_records AND clients.created_by = auth.uid()) OR
        (up.can_edit_subordinate_records AND clients.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), clients.tenant_id))) OR
        (up.can_edit_peer_records AND clients.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), clients.tenant_id)))
      )
  )
);

CREATE POLICY "clients_delete_rbac" ON clients
FOR DELETE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = clients.tenant_id
      AND (
        up.can_delete_all_records OR
        (up.can_delete_own_records AND clients.created_by = auth.uid()) OR
        (up.can_delete_subordinate_records AND clients.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), clients.tenant_id))) OR
        (up.can_delete_peer_records AND clients.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), clients.tenant_id)))
      )
  )
);

-- ========== JOB_ORDERS POLICIES ==========
CREATE POLICY "job_orders_select_rbac" ON job_orders
FOR SELECT USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = job_orders.tenant_id
      AND (
        up.can_view_all_records OR
        (up.can_view_own_records AND (job_orders.created_by = auth.uid() OR job_orders.created_by IS NULL)) OR
        (up.can_view_subordinate_records AND (job_orders.created_by IS NULL OR job_orders.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), job_orders.tenant_id)))) OR
        (up.can_view_peer_records AND job_orders.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), job_orders.tenant_id)))
      )
  )
);

CREATE POLICY "job_orders_insert_rbac" ON job_orders
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = job_orders.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY "job_orders_update_rbac" ON job_orders
FOR UPDATE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = job_orders.tenant_id
      AND (
        up.can_edit_all_records OR
        (up.can_edit_own_records AND job_orders.created_by = auth.uid()) OR
        (up.can_edit_subordinate_records AND job_orders.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), job_orders.tenant_id))) OR
        (up.can_edit_peer_records AND job_orders.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), job_orders.tenant_id)))
      )
  )
);

CREATE POLICY "job_orders_delete_rbac" ON job_orders
FOR DELETE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = job_orders.tenant_id
      AND (
        up.can_delete_all_records OR
        (up.can_delete_own_records AND job_orders.created_by = auth.uid()) OR
        (up.can_delete_subordinate_records AND job_orders.created_by IN (SELECT user_id FROM rbac_subordinate_profile_ids(auth.uid(), job_orders.tenant_id))) OR
        (up.can_delete_peer_records AND job_orders.created_by IN (SELECT user_id FROM rbac_peer_profile_ids(auth.uid(), job_orders.tenant_id)))
      )
  )
);

-- ========== PIPELINES POLICIES ==========
CREATE POLICY "pipelines_select_rbac" ON pipelines
FOR SELECT USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = pipelines.tenant_id
  )
);

CREATE POLICY "pipelines_insert_rbac" ON pipelines
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);

CREATE POLICY "pipelines_update_rbac" ON pipelines
FOR UPDATE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);

CREATE POLICY "pipelines_delete_rbac" ON pipelines
FOR DELETE USING (
  (auth.jwt()->>'role' = 'service_role') OR
  EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);
