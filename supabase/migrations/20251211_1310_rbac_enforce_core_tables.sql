-- =========================================================
-- RBAC Enforcement for core CRM tables
-- Tables: contacts, clients, job_orders, pipelines
-- Uses: user_permissions view + user_hierarchy for subordinates
--
-- Notes:
-- - This relies on audit columns (created_by/updated_by) being UUIDs
--   that reference public.profiles(id).
-- - Subordinate access is defined by public.user_hierarchy (manager_id/subordinate_id).
-- =========================================================

-- Helper: return all subordinate profile IDs for a manager within a tenant
CREATE OR REPLACE FUNCTION public.rbac_subordinate_profile_ids(p_manager uuid, p_tenant uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinates AS (
    SELECT uh.subordinate_id AS user_id
    FROM public.user_hierarchy uh
    JOIN public.profiles mp ON mp.id = uh.manager_id
    JOIN public.profiles sp ON sp.id = uh.subordinate_id
    WHERE uh.manager_id = p_manager
      AND mp.tenant_id = p_tenant
      AND sp.tenant_id = p_tenant

    UNION

    SELECT uh2.subordinate_id AS user_id
    FROM public.user_hierarchy uh2
    JOIN subordinates s ON uh2.manager_id = s.user_id
    JOIN public.profiles sp2 ON sp2.id = uh2.subordinate_id
    WHERE sp2.tenant_id = p_tenant
  )
  SELECT DISTINCT user_id FROM subordinates;
$$;

-- =========================================================
-- CONTACTS
-- =========================================================
DROP POLICY IF EXISTS contacts_select_rbac ON public.contacts;
DROP POLICY IF EXISTS contacts_insert_rbac ON public.contacts;
DROP POLICY IF EXISTS contacts_update_rbac ON public.contacts;
DROP POLICY IF EXISTS contacts_delete_rbac ON public.contacts;

CREATE POLICY contacts_select_rbac ON public.contacts
FOR SELECT
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.contacts.tenant_id
      AND (
        up.can_view_all_records
        OR (up.can_view_own_records AND (public.contacts.created_by = auth.uid() OR public.contacts.created_by IS NULL))
        OR (up.can_view_subordinate_records AND (public.contacts.created_by IS NULL OR public.contacts.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.contacts.tenant_id)
        )))
      )
  )
);

CREATE POLICY contacts_insert_rbac ON public.contacts
FOR INSERT
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.contacts.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY contacts_update_rbac ON public.contacts
FOR UPDATE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.contacts.tenant_id
      AND (
        up.can_edit_all_records
        OR (up.can_edit_own_records AND public.contacts.created_by = auth.uid())
        OR (up.can_edit_subordinate_records AND public.contacts.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.contacts.tenant_id)
        ))
      )
  )
)
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.contacts.tenant_id
      AND (
        up.can_edit_all_records
        OR up.can_edit_own_records
        OR up.can_edit_subordinate_records
      )
  )
);

CREATE POLICY contacts_delete_rbac ON public.contacts
FOR DELETE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.contacts.tenant_id
      AND (
        up.can_delete_all_records
        OR (up.can_delete_own_records AND public.contacts.created_by = auth.uid())
        OR (up.can_delete_subordinate_records AND public.contacts.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.contacts.tenant_id)
        ))
      )
  )
);

-- =========================================================
-- CLIENTS
-- =========================================================
DROP POLICY IF EXISTS select_clients_policy ON public.clients;
DROP POLICY IF EXISTS insert_clients_policy ON public.clients;
DROP POLICY IF EXISTS update_clients_policy ON public.clients;
DROP POLICY IF EXISTS delete_clients_policy ON public.clients;

DROP POLICY IF EXISTS clients_select_rbac ON public.clients;
DROP POLICY IF EXISTS clients_insert_rbac ON public.clients;
DROP POLICY IF EXISTS clients_update_rbac ON public.clients;
DROP POLICY IF EXISTS clients_delete_rbac ON public.clients;

CREATE POLICY clients_select_rbac ON public.clients
FOR SELECT
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.clients.tenant_id
      AND (
        up.can_view_all_records
        OR (up.can_view_own_records AND (public.clients.created_by = auth.uid() OR public.clients.created_by IS NULL))
        OR (up.can_view_subordinate_records AND (public.clients.created_by IS NULL OR public.clients.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.clients.tenant_id)
        )))
      )
  )
);

CREATE POLICY clients_insert_rbac ON public.clients
FOR INSERT
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.clients.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY clients_update_rbac ON public.clients
FOR UPDATE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.clients.tenant_id
      AND (
        up.can_edit_all_records
        OR (up.can_edit_own_records AND public.clients.created_by = auth.uid())
        OR (up.can_edit_subordinate_records AND public.clients.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.clients.tenant_id)
        ))
      )
  )
)
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.clients.tenant_id
      AND (
        up.can_edit_all_records
        OR up.can_edit_own_records
        OR up.can_edit_subordinate_records
      )
  )
);

CREATE POLICY clients_delete_rbac ON public.clients
FOR DELETE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.clients.tenant_id
      AND (
        up.can_delete_all_records
        OR (up.can_delete_own_records AND public.clients.created_by = auth.uid())
        OR (up.can_delete_subordinate_records AND public.clients.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.clients.tenant_id)
        ))
      )
  )
);

-- =========================================================
-- JOB ORDERS
-- =========================================================
DROP POLICY IF EXISTS select_job_orders_policy ON public.job_orders;
DROP POLICY IF EXISTS insert_job_orders_policy ON public.job_orders;
DROP POLICY IF EXISTS update_job_orders_policy ON public.job_orders;
DROP POLICY IF EXISTS delete_job_orders_policy ON public.job_orders;

DROP POLICY IF EXISTS job_orders_select_rbac ON public.job_orders;
DROP POLICY IF EXISTS job_orders_insert_rbac ON public.job_orders;
DROP POLICY IF EXISTS job_orders_update_rbac ON public.job_orders;
DROP POLICY IF EXISTS job_orders_delete_rbac ON public.job_orders;

CREATE POLICY job_orders_select_rbac ON public.job_orders
FOR SELECT
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.job_orders.tenant_id
      AND (
        up.can_view_all_records
        OR (up.can_view_own_records AND (public.job_orders.created_by = auth.uid() OR public.job_orders.created_by IS NULL))
        OR (up.can_view_subordinate_records AND (public.job_orders.created_by IS NULL OR public.job_orders.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.job_orders.tenant_id)
        )))
      )
  )
);

CREATE POLICY job_orders_insert_rbac ON public.job_orders
FOR INSERT
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.job_orders.tenant_id
      AND up.can_create_records
  )
);

CREATE POLICY job_orders_update_rbac ON public.job_orders
FOR UPDATE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.job_orders.tenant_id
      AND (
        up.can_edit_all_records
        OR (up.can_edit_own_records AND public.job_orders.created_by = auth.uid())
        OR (up.can_edit_subordinate_records AND public.job_orders.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.job_orders.tenant_id)
        ))
      )
  )
)
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.job_orders.tenant_id
      AND (
        up.can_edit_all_records
        OR up.can_edit_own_records
        OR up.can_edit_subordinate_records
      )
  )
);

CREATE POLICY job_orders_delete_rbac ON public.job_orders
FOR DELETE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.job_orders.tenant_id
      AND (
        up.can_delete_all_records
        OR (up.can_delete_own_records AND public.job_orders.created_by = auth.uid())
        OR (up.can_delete_subordinate_records AND public.job_orders.created_by IN (
          SELECT user_id FROM public.rbac_subordinate_profile_ids(auth.uid(), public.job_orders.tenant_id)
        ))
      )
  )
);

-- =========================================================
-- PIPELINES
-- - View: any active role within tenant
-- - Insert/Update/Delete: manager+ (role_level >= 4) or can_manage_businesses
-- =========================================================
DROP POLICY IF EXISTS pipelines_select_all ON public.pipelines;
DROP POLICY IF EXISTS pipelines_insert_all ON public.pipelines;
DROP POLICY IF EXISTS pipelines_update_all ON public.pipelines;
DROP POLICY IF EXISTS pipelines_delete_all ON public.pipelines;
DROP POLICY IF EXISTS pipelines_select_rbac ON public.pipelines;
DROP POLICY IF EXISTS pipelines_insert_rbac ON public.pipelines;
DROP POLICY IF EXISTS pipelines_update_rbac ON public.pipelines;
DROP POLICY IF EXISTS pipelines_delete_rbac ON public.pipelines;
DROP POLICY IF EXISTS pipelines_service_role_all ON public.pipelines;

CREATE POLICY pipelines_service_role_all ON public.pipelines
FOR ALL
USING ((auth.jwt()->>'role') = 'service_role')
WITH CHECK ((auth.jwt()->>'role') = 'service_role');

CREATE POLICY pipelines_select_rbac ON public.pipelines
FOR SELECT
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.pipelines.tenant_id
  )
);

CREATE POLICY pipelines_insert_rbac ON public.pipelines
FOR INSERT
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);

CREATE POLICY pipelines_update_rbac ON public.pipelines
FOR UPDATE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
)
WITH CHECK (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);

CREATE POLICY pipelines_delete_rbac ON public.pipelines
FOR DELETE
USING (
  (auth.jwt()->>'role' = 'service_role')
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = public.pipelines.tenant_id
      AND (up.role_level >= 4 OR up.can_manage_businesses)
  )
);
