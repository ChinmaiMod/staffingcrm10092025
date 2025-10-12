-- ============================================
-- Seed Intuites LLC lookup data and sample contacts
-- ============================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_business_id uuid;
  v_existing_business_id uuid;
  v_status_initial uuid;
  v_status_spoke uuid;
  v_reason_training uuid;
  v_reason_h1b uuid;
  v_role_remote uuid;
  v_role_hybrid uuid;
  v_visa_h1b uuid;
  v_visa_opt uuid;
  v_job_java uuid;
  v_job_rn uuid;
  v_year_4_6 uuid;
  v_year_7_9 uuid;
  v_contact_id uuid;
BEGIN
  -- Ensure tenant exists for Intuites LLC
  SELECT tenant_id
  INTO v_tenant_id
  FROM tenants
  WHERE lower(company_name) = lower('Intuites LLC')
     OR lower(company_name) = lower('Intuites')
     OR lower(email_domain) = lower('intuites.com')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (company_name, email_domain, status)
    VALUES ('Intuites LLC', 'intuites.com', 'ACTIVE')
    RETURNING tenant_id INTO v_tenant_id;
  ELSE
    UPDATE tenants
    SET company_name = 'Intuites LLC',
        email_domain = COALESCE(email_domain, 'intuites.com'),
        status = 'ACTIVE',
        updated_at = now()
    WHERE tenant_id = v_tenant_id;
  END IF;

  -- Ensure default business exists
  INSERT INTO businesses (
    tenant_id,
    business_name,
    business_type,
    description,
    industry,
    enabled_contact_types,
    settings,
    is_active,
    is_default
  ) VALUES (
    v_tenant_id,
    'Intuites LLC',
    'GENERAL',
    'Default business created during Intuites LLC data seeding',
    'Staffing',
    ARRAY['IT_CANDIDATE','HEALTHCARE_CANDIDATE','VENDOR_CLIENT','VENDOR_EMPANELMENT','EMPLOYEE_INDIA','EMPLOYEE_USA'],
    jsonb_build_object('seeded_at', now(), 'seed_source', '023_seed_intuites_lookup_data.sql'),
    true,
    true
  )
  ON CONFLICT (tenant_id, business_name) DO UPDATE
    SET business_type = EXCLUDED.business_type,
        description = EXCLUDED.description,
        industry = EXCLUDED.industry,
        enabled_contact_types = EXCLUDED.enabled_contact_types,
        settings = businesses.settings || EXCLUDED.settings,
        is_active = true,
        is_default = true,
        updated_at = now()
  RETURNING business_id INTO v_business_id;

  IF v_business_id IS NULL THEN
    SELECT business_id
    INTO v_business_id
    FROM businesses
    WHERE tenant_id = v_tenant_id
    ORDER BY is_default DESC, created_at
    LIMIT 1;
  END IF;

  -- Make sure selected business is marked as default and active
  UPDATE businesses
  SET is_default = true,
      is_active = true,
      updated_at = now()
  WHERE business_id = v_business_id;

  -- Update any legacy lookup rows without business_id
  UPDATE visa_status
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE job_titles
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE reasons_for_contact
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE contact_statuses
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE role_types
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE years_experience
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE referral_sources
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  -- Copy global lookup data (tenant_id IS NULL) into Intuites tenant
  WITH source AS (
    SELECT DISTINCT code, label FROM visa_status WHERE tenant_id IS NULL
  )
  INSERT INTO visa_status (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM visa_status vs
    WHERE vs.tenant_id = v_tenant_id AND vs.code = s.code
  );

  WITH source AS (
    SELECT DISTINCT category, title FROM job_titles WHERE tenant_id IS NULL
  )
  INSERT INTO job_titles (tenant_id, business_id, category, title)
  SELECT v_tenant_id, v_business_id, s.category, s.title
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM job_titles jt
    WHERE jt.tenant_id = v_tenant_id AND jt.category = s.category AND jt.title = s.title
  );

  WITH source AS (
    SELECT DISTINCT code, label FROM reasons_for_contact WHERE tenant_id IS NULL
  )
  INSERT INTO reasons_for_contact (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM reasons_for_contact rf
    WHERE rf.tenant_id = v_tenant_id AND rf.code = s.code
  );

  WITH source AS (
    SELECT DISTINCT code, label FROM contact_statuses WHERE tenant_id IS NULL
  )
  INSERT INTO contact_statuses (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM contact_statuses cs
    WHERE cs.tenant_id = v_tenant_id AND cs.code = s.code
  );

  WITH source AS (
    SELECT DISTINCT code, label FROM role_types WHERE tenant_id IS NULL
  )
  INSERT INTO role_types (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM role_types rt
    WHERE rt.tenant_id = v_tenant_id AND rt.code = s.code
  );

  WITH source AS (
    SELECT DISTINCT code, label FROM years_experience WHERE tenant_id IS NULL
  )
  INSERT INTO years_experience (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM years_experience ye
    WHERE ye.tenant_id = v_tenant_id AND ye.code = s.code
  );

  WITH source AS (
    SELECT DISTINCT code, label FROM referral_sources WHERE tenant_id IS NULL
  )
  INSERT INTO referral_sources (tenant_id, business_id, code, label)
  SELECT v_tenant_id, v_business_id, s.code, s.label
  FROM source s
  WHERE NOT EXISTS (
    SELECT 1 FROM referral_sources rs
    WHERE rs.tenant_id = v_tenant_id AND rs.code = s.code
  );

  -- Fetch lookup IDs for sample contacts
  SELECT status_id INTO v_status_initial
  FROM contact_statuses
  WHERE tenant_id = v_tenant_id AND code = 'INITIAL_CONTACT'
  LIMIT 1;

  SELECT status_id INTO v_status_spoke
  FROM contact_statuses
  WHERE tenant_id = v_tenant_id AND code = 'SPOKE_TO_CANDIDATE'
  LIMIT 1;

  SELECT reason_id INTO v_reason_training
  FROM reasons_for_contact
  WHERE tenant_id = v_tenant_id AND code = 'TRAINING_PLACEMENT'
  LIMIT 1;

  SELECT reason_id INTO v_reason_h1b
  FROM reasons_for_contact
  WHERE tenant_id = v_tenant_id AND code = 'H1B_SPONSORSHIP'
  LIMIT 1;

  SELECT role_type_id INTO v_role_remote
  FROM role_types
  WHERE tenant_id = v_tenant_id AND code = 'REMOTE'
  LIMIT 1;

  SELECT role_type_id INTO v_role_hybrid
  FROM role_types
  WHERE tenant_id = v_tenant_id AND code = 'HYBRID_LOCAL'
  LIMIT 1;

  SELECT visa_status_id INTO v_visa_h1b
  FROM visa_status
  WHERE tenant_id = v_tenant_id AND code = 'H1B'
  LIMIT 1;

  SELECT visa_status_id INTO v_visa_opt
  FROM visa_status
  WHERE tenant_id = v_tenant_id AND code = 'OPT'
  LIMIT 1;

  SELECT job_title_id INTO v_job_java
  FROM job_titles
  WHERE tenant_id = v_tenant_id AND title = 'Java Full Stack Developer'
  LIMIT 1;

  SELECT job_title_id INTO v_job_rn
  FROM job_titles
  WHERE tenant_id = v_tenant_id AND title = 'Registered nurse (RN)'
  LIMIT 1;

  SELECT years_experience_id INTO v_year_4_6
  FROM years_experience
  WHERE tenant_id = v_tenant_id AND code = '4_6'
  LIMIT 1;

  SELECT years_experience_id INTO v_year_7_9
  FROM years_experience
  WHERE tenant_id = v_tenant_id AND code = '7_9'
  LIMIT 1;

  -- Sample IT candidate contact
  SELECT contact_id INTO v_contact_id
  FROM contacts
  WHERE tenant_id = v_tenant_id AND lower(email) = lower('john.doe@intuites.com')
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (
      tenant_id,
      business_id,
      contact_type,
      first_name,
      last_name,
      email,
      phone,
      status_id,
      visa_status_id,
      job_title_id,
      years_experience_id,
      remarks,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      v_business_id,
      'IT_CANDIDATE',
      'John',
      'Doe',
      'john.doe@intuites.com',
      '+1 (555) 123-4567',
      v_status_initial,
      v_visa_h1b,
      v_job_java,
      v_year_4_6,
      'Interested in training and placement opportunities.',
      now() - interval '14 days',
      now() - interval '7 days'
    )
    RETURNING contact_id INTO v_contact_id;

    IF v_reason_training IS NOT NULL THEN
      INSERT INTO contact_reasons (contact_id, reason_id)
      VALUES (v_contact_id, v_reason_training)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_role_remote IS NOT NULL THEN
      INSERT INTO contact_role_types (contact_id, role_type_id)
      VALUES (v_contact_id, v_role_remote)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Sample healthcare candidate contact
  SELECT contact_id INTO v_contact_id
  FROM contacts
  WHERE tenant_id = v_tenant_id AND lower(email) = lower('jane.smith@intuites.com')
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO contacts (
      tenant_id,
      business_id,
      contact_type,
      first_name,
      last_name,
      email,
      phone,
      status_id,
      visa_status_id,
      job_title_id,
      years_experience_id,
      remarks,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      v_business_id,
      'HEALTHCARE_CANDIDATE',
      'Jane',
      'Smith',
      'jane.smith@intuites.com',
      '+1 (555) 987-6543',
      v_status_spoke,
      v_visa_opt,
      v_job_rn,
      v_year_7_9,
      'Ready for recruiter marketing, prefers hybrid roles.',
      now() - interval '9 days',
      now() - interval '2 days'
    )
    RETURNING contact_id INTO v_contact_id;

    IF v_reason_h1b IS NOT NULL THEN
      INSERT INTO contact_reasons (contact_id, reason_id)
      VALUES (v_contact_id, v_reason_h1b)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_role_hybrid IS NOT NULL THEN
      INSERT INTO contact_role_types (contact_id, role_type_id)
      VALUES (v_contact_id, v_role_hybrid)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END
$$;
