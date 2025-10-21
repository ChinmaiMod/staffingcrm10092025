-- ============================================
-- Seed Intuites LLC lookup data and sample contacts
-- ============================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_business_id bigint;
  v_contact_id bigint;
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

  -- Ensure business exists (legacy schema uses minimal columns)
  SELECT id
  INTO v_business_id
  FROM businesses
  WHERE tenant_id = v_tenant_id
    AND lower(business_name) IN (lower('Intuites LLC'), lower('Intuites'))
  ORDER BY created_at
  LIMIT 1;

  IF v_business_id IS NULL THEN
    INSERT INTO businesses (
      tenant_id,
      business_name,
      business_type,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      'Intuites LLC',
      'LLC',
      now(),
      now()
    )
    RETURNING id INTO v_business_id;
  ELSE
    UPDATE businesses
    SET business_name = 'Intuites LLC',
        business_type = COALESCE(business_type, 'LLC'),
        updated_at = now()
    WHERE id = v_business_id;
  END IF;

  -- Update any legacy lookup rows without business_id
  UPDATE visa_status
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE job_title
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE reason_for_contact
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE workflow_status
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE type_of_roles
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE type_of_contact
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE referral_sources
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  UPDATE years_of_experience
  SET business_id = v_business_id
  WHERE tenant_id = v_tenant_id AND business_id IS NULL;

  -- Visa status values
  WITH desired AS (
    SELECT value FROM (VALUES
      ('F1'),
      ('OPT'),
      ('STEM OPT'),
      ('H1B'),
      ('H4'),
      ('H4 EAD'),
      ('GC EAD'),
      ('L1B'),
      ('L2S'),
      ('B1/B2'),
      ('J1'),
      ('TN'),
      ('E3'),
      ('GC'),
      ('USC')
    ) AS x(value)
  )
  INSERT INTO visa_status (visa_status, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM visa_status vs
    WHERE vs.tenant_id = v_tenant_id
      AND lower(vs.visa_status) = lower(d.value)
  );

  -- Job titles by field
  WITH desired AS (
    SELECT field, job_title FROM (VALUES
      ('IT', 'Java Back End Developer'),
      ('IT', 'Java Full Stack Developer'),
      ('IT', 'Dotnet Developer'),
      ('IT', 'Python Developer'),
      ('IT', 'Data Analyst'),
      ('IT', 'AWS Data Engineer'),
      ('IT', 'Azure Data Engineer'),
      ('IT', 'GCP Data Engineer'),
      ('IT', 'Big Data Developer'),
      ('IT', 'Power BI Developer'),
      ('IT', 'Qliksense Developer'),
      ('IT', 'Tableau Developer'),
      ('IT', 'Informatica Developer'),
      ('IT', 'Talend Developer'),
      ('IT', 'Abinitio Developer'),
      ('IT', 'Oracle PL/SQL Developer'),
      ('IT', 'Oracle Apex Developer'),
      ('IT', 'Business Analyst'),
      ('IT', 'Manual QA'),
      ('IT', 'Automation QA'),
      ('IT', 'ETL Tester'),
      ('IT', 'iOS Developer'),
      ('IT', 'Android Developer'),
      ('IT', 'AWS DevOps Engineer'),
      ('IT', 'Azure DevOps Engineer'),
      ('IT', 'GCP DevOps Engineer'),
      ('IT', 'Mainframe Developer'),
      ('IT', 'Mainframe Architect'),
      ('Healthcare', 'Licensed Practical Nurse (LPN)'),
      ('Healthcare', 'Geriatric Nursing Assistant (GNA)'),
      ('Healthcare', 'Registered Nurse (RN)'),
      ('Healthcare', 'Respiratory Therapist (RRT)'),
      ('Healthcare', 'Nurse Practitioner (NP)')
    ) AS x(field, job_title)
  )
  INSERT INTO job_title (field, job_title, tenant_id, business_id)
  SELECT d.field, d.job_title, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM job_title jt
    WHERE jt.tenant_id = v_tenant_id
      AND lower(jt.field) = lower(d.field)
      AND lower(jt.job_title) = lower(d.job_title)
  );

  -- Reasons for contact
  WITH desired AS (
    SELECT value FROM (VALUES
      ('Training and Placement'),
      ('Marketing and Placement'),
      ('H1B Sponsorship'),
      ('H1B Transfer'),
      ('GC Processing')
    ) AS x(value)
  )
  INSERT INTO reason_for_contact (reason_for_contact, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM reason_for_contact rf
    WHERE rf.tenant_id = v_tenant_id
      AND lower(rf.reason_for_contact) = lower(d.value)
  );

  -- Workflow statuses
  WITH desired AS (
    SELECT value FROM (VALUES
      ('Initial Contact'),
      ('Spoke to Candidate'),
      ('Resume Needs Preparation'),
      ('Resume Prepared and Sent for Review'),
      ('Assigned to Recruiter'),
      ('Submitted to Client'),
      ('Client Interview Scheduled'),
      ('Offer Accepted'),
      ('Offer Declined')
    ) AS x(value)
  )
  INSERT INTO workflow_status (workflow_status, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM workflow_status ws
    WHERE ws.tenant_id = v_tenant_id
      AND lower(ws.workflow_status) = lower(d.value)
  );

  -- Role preferences
  WITH desired AS (
    SELECT value FROM (VALUES
      ('Remote'),
      ('Hybrid Local'),
      ('Onsite Local'),
      ('Open to Relocate')
    ) AS x(value)
  )
  INSERT INTO type_of_roles (type_of_roles, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM type_of_roles tr
    WHERE tr.tenant_id = v_tenant_id
      AND lower(tr.type_of_roles) = lower(d.value)
  );

  -- Contact types
  WITH desired AS (
    SELECT value FROM (VALUES
      ('IT Candidate'),
      ('Healthcare Candidate'),
      ('Vendor Client'),
      ('Vendor Empanelment'),
      ('Employee - India'),
      ('Employee - USA')
    ) AS x(value)
  )
  INSERT INTO type_of_contact (type_of_contact, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM type_of_contact tc
    WHERE tc.tenant_id = v_tenant_id
      AND lower(tc.type_of_contact) = lower(d.value)
  );

  -- Referral sources
  WITH desired AS (
    SELECT value FROM (VALUES
      ('Facebook'),
      ('Google'),
      ('Friend')
    ) AS x(value)
  )
  INSERT INTO referral_sources (referral_source, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM referral_sources rs
    WHERE rs.tenant_id = v_tenant_id
      AND lower(rs.referral_source) = lower(d.value)
  );

  -- Years of experience buckets
  WITH desired AS (
    SELECT value FROM (VALUES
      ('0'),
      ('1 to 3'),
      ('4 to 6'),
      ('7 to 9'),
      ('10 -15'),
      ('15+')
    ) AS x(value)
  )
  INSERT INTO years_of_experience (years_of_experience, tenant_id, business_id)
  SELECT d.value, v_tenant_id, v_business_id
  FROM desired d
  WHERE NOT EXISTS (
    SELECT 1
    FROM years_of_experience ye
    WHERE ye.tenant_id = v_tenant_id
      AND lower(ye.years_of_experience) = lower(d.value)
  );

  -- Lookup reason_for_contact_id for 'Training and Placement'
  DECLARE v_reason_for_contact_id bigint;
  SELECT id INTO v_reason_for_contact_id FROM reason_for_contact WHERE tenant_id = v_tenant_id AND lower(reason_for_contact) = lower('Training and Placement') LIMIT 1;

  SELECT id INTO v_contact_id
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
      workflow_status,
      visa_status,
      job_title,
      years_of_experience,
      reason_for_contact_id,
      type_of_roles,
      referral_source,
      remarks,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      v_business_id,
      'IT Candidate',
      'John',
      'Doe',
      'john.doe@intuites.com',
      '+1 (555) 123-4567',
      'Initial Contact',
      'H1B',
      'Java Full Stack Developer',
      '4 to 6',
      v_reason_for_contact_id,
      'Remote',
      'Google',
      'Interested in training and placement opportunities.',
      now() - interval '14 days',
      now() - interval '7 days'
    );
  ELSE
    UPDATE contacts
    SET business_id = v_business_id,
        contact_type = 'IT Candidate',
        workflow_status = 'Initial Contact',
        visa_status = 'H1B',
        job_title = 'Java Full Stack Developer',
        years_of_experience = '4 to 6',
        reason_for_contact_id = v_reason_for_contact_id,
        type_of_roles = 'Remote',
        referral_source = 'Google',
        remarks = 'Interested in training and placement opportunities.',
        updated_at = now()
    WHERE id = v_contact_id;
  END IF;

  -- Lookup reason_for_contact_id for 'H1B Sponsorship'
  DECLARE v_reason_for_contact_id_hc bigint;
  SELECT id INTO v_reason_for_contact_id_hc FROM reason_for_contact WHERE tenant_id = v_tenant_id AND lower(reason_for_contact) = lower('H1B Sponsorship') LIMIT 1;

  SELECT id INTO v_contact_id
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
      workflow_status,
      visa_status,
      job_title,
      years_of_experience,
      reason_for_contact_id,
      type_of_roles,
      referral_source,
      remarks,
      created_at,
      updated_at
    ) VALUES (
      v_tenant_id,
      v_business_id,
      'Healthcare Candidate',
      'Jane',
      'Smith',
      'jane.smith@intuites.com',
      '+1 (555) 987-6543',
      'Spoke to Candidate',
      'OPT',
      'Registered Nurse (RN)',
      '7 to 9',
      v_reason_for_contact_id_hc,
      'Hybrid Local',
      'Facebook',
      'Ready for recruiter marketing, prefers hybrid roles.',
      now() - interval '9 days',
      now() - interval '2 days'
    );
  ELSE
    UPDATE contacts
    SET business_id = v_business_id,
        contact_type = 'Healthcare Candidate',
        workflow_status = 'Spoke to Candidate',
        visa_status = 'OPT',
        job_title = 'Registered Nurse (RN)',
        years_of_experience = '7 to 9',
        reason_for_contact_id = v_reason_for_contact_id_hc,
        type_of_roles = 'Hybrid Local',
        referral_source = 'Facebook',
        remarks = 'Ready for recruiter marketing, prefers hybrid roles.',
        updated_at = now()
    WHERE id = v_contact_id;
  END IF;
END
$$;
