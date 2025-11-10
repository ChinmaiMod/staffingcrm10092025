# Staffing HRMS - Complete Data Model & Schema Design

## Overview
Multi-tenant HRMS system integrated with Staffing CRM, built on React (Vite) + Supabase (PostgreSQL) with RLS-based tenant isolation.

## Core Principles
- All tables prefixed with `hrms_`
- All tables include `tenant_id` and `business_id` for multi-tenancy
- RLS policies enforce tenant isolation
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`
- Soft deletes where applicable (`deleted_at`, `is_active`)

---

## 1. EMPLOYEE CORE TABLES

### 1.1 hrms_employees (Core Employee Information)
Primary table for all employee types.

```sql
CREATE TABLE hrms_employees (
  employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  
  -- From CRM Bridge
  crm_contact_id UUID REFERENCES contacts(id),
  
  -- Basic Info
  employee_code VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Employee Type
  employee_type VARCHAR(50) NOT NULL, -- 'internal_india', 'internal_usa', 'it_usa', 'healthcare_usa'
  
  -- Dates
  date_of_birth DATE,
  date_of_birth_as_per_record DATE,
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Job Details
  job_title_id INTEGER REFERENCES job_title(id),
  department VARCHAR(100),
  
  -- Sensitive Info (encrypted)
  ssn_encrypted TEXT,
  
  -- Status
  employment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'terminated', 'on_leave'
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT valid_employee_type CHECK (employee_type IN ('internal_india', 'internal_usa', 'it_usa', 'healthcare_usa'))
);

CREATE INDEX idx_hrms_employees_tenant ON hrms_employees(tenant_id);
CREATE INDEX idx_hrms_employees_business ON hrms_employees(business_id);
CREATE INDEX idx_hrms_employees_type ON hrms_employees(employee_type);
CREATE INDEX idx_hrms_employees_status ON hrms_employees(employment_status);
CREATE INDEX idx_hrms_employees_crm_contact ON hrms_employees(crm_contact_id);
```

---

### 1.2 hrms_employee_addresses (Time-Based Address History)
Tracks multiple addresses with temporal validity.

```sql
CREATE TABLE hrms_employee_addresses (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Address Type
  address_type VARCHAR(50) NOT NULL, -- 'current', 'permanent', 'mailing', 'previous'
  
  -- Address Details
  street_address_1 VARCHAR(255),
  street_address_2 VARCHAR(255),
  city_id UUID REFERENCES cities(city_id),
  state_id UUID REFERENCES states(state_id),
  country_id UUID REFERENCES countries(country_id),
  postal_code VARCHAR(20),
  
  -- Temporal Validity
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_current BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_date_range CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX idx_hrms_addresses_employee ON hrms_employee_addresses(employee_id);
CREATE INDEX idx_hrms_addresses_current ON hrms_employee_addresses(is_current) WHERE is_current = true;
CREATE INDEX idx_hrms_addresses_dates ON hrms_employee_addresses(valid_from, valid_to);
```

---

## 2. UNIVERSAL DOCUMENT CHECKLIST SYSTEM

**Key Enhancement:** Generalized checklist architecture for ALL document types (immigration, project, timesheet, compliance, etc.)

### 2.1 hrms_checklist_templates (Universal Checklist Templates)
Master templates for ANY type of checklist - reusable across the entire system.

```sql
CREATE TABLE hrms_checklist_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  
  template_name VARCHAR(255) NOT NULL,
  
  -- Universal Checklist Type
  checklist_type VARCHAR(100) NOT NULL, -- 'immigration', 'project', 'timesheet', 'compliance', 'employee_onboarding', 'employee_offboarding', 'background_check', 'performance_review', etc.
  
  -- Optional: Employee Type (for immigration checklists)
  employee_type VARCHAR(50), -- 'internal_india', 'internal_usa', 'it_usa', 'healthcare_usa', NULL for non-employee checklists
  
  -- Optional: Context Reference
  context_entity VARCHAR(100), -- 'employee', 'project', 'timesheet', NULL
  
  description TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_checklist_type CHECK (checklist_type IN ('immigration', 'project', 'timesheet', 'compliance', 'employee_onboarding', 'employee_offboarding', 'background_check', 'performance_review', 'msa_po', 'coi', 'custom'))
);

CREATE INDEX idx_hrms_checklist_templates_type ON hrms_checklist_templates(checklist_type);
CREATE INDEX idx_hrms_checklist_templates_employee_type ON hrms_checklist_templates(employee_type);
CREATE INDEX idx_hrms_checklist_templates_context ON hrms_checklist_templates(context_entity);

-- Examples:
-- Immigration Checklist: checklist_type='immigration', employee_type='it_usa', context_entity='employee'
-- Project Checklist: checklist_type='project', employee_type=NULL, context_entity='project'
-- MSA/PO Checklist: checklist_type='msa_po', employee_type=NULL, context_entity='project'
-- COI Checklist: checklist_type='coi', employee_type=NULL, context_entity='project'
-- Timesheet Checklist: checklist_type='timesheet', employee_type=NULL, context_entity='timesheet'
```

---

### 2.2 hrms_checklist_groups (Document Groups)
Grouping mechanism for organizing checklist items (e.g., Educational Documents, Immigration Documents).

```sql
CREATE TABLE hrms_checklist_groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  template_id UUID NOT NULL REFERENCES hrms_checklist_templates(template_id) ON DELETE CASCADE,
  
  group_name VARCHAR(255) NOT NULL,
  group_description TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_checklist_groups_template ON hrms_checklist_groups(template_id);
```

---

### 2.3 hrms_checklist_items (Checklist Item Definitions)
Individual checklist items within groups (e.g., Bachelor's Degree, Master's Degree, H1B Copy, BLS License).

```sql
CREATE TABLE hrms_checklist_items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  template_id UUID NOT NULL REFERENCES hrms_checklist_templates(template_id) ON DELETE CASCADE,
  group_id UUID REFERENCES hrms_checklist_groups(group_id) ON DELETE SET NULL,
  
  item_name VARCHAR(255),  -- Optional as per requirements
  item_description TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Flags
  is_required BOOLEAN DEFAULT false,
  compliance_tracking_flag BOOLEAN DEFAULT false,
  visible_to_employee_flag BOOLEAN DEFAULT true,
  
  -- AI Document Parsing
  enable_ai_parsing BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_checklist_items_template ON hrms_checklist_items(template_id);
CREATE INDEX idx_hrms_checklist_items_group ON hrms_checklist_items(group_id);
CREATE INDEX idx_hrms_checklist_items_compliance ON hrms_checklist_items(compliance_tracking_flag) WHERE compliance_tracking_flag = true;
```

---

### 2.4 hrms_documents (Universal Document Storage)
**GENERALIZED:** Stores ALL documents (employee, project, timesheet, compliance) with version history and AI-parsed metadata.

```sql
CREATE TABLE hrms_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  
  -- Universal Context References (polymorphic)
  entity_type VARCHAR(50) NOT NULL, -- 'employee', 'project', 'timesheet', 'compliance', 'system'
  entity_id UUID NOT NULL, -- References employee_id, project_id, timesheet_id, etc.
  
  -- Checklist Association
  checklist_item_id UUID REFERENCES hrms_checklist_items(item_id),
  
  -- Document Info
  document_name VARCHAR(255) NOT NULL,
  document_description TEXT,
  document_type VARCHAR(100), -- 'passport', 'visa', 'i9', 'w4', 'h1b', 'license', 'bls', 'degree', 'msa', 'po', 'coi', 'timesheet', etc.
  
  -- File Storage
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes BIGINT,
  
  -- Validity Dates (AI-parsed or manually entered)
  start_date DATE,
  expiry_date DATE,
  
  -- Flags
  compliance_tracking_flag BOOLEAN DEFAULT false,
  visible_to_employee_flag BOOLEAN DEFAULT true,
  is_current_version BOOLEAN DEFAULT true,
  
  -- AI Parsing Results (OpenRouter Claude)
  ai_parsed_data JSONB,
  ai_parsed_at TIMESTAMPTZ,
  ai_confidence_score DECIMAL(3,2),
  ai_model_used VARCHAR(100),
  
  -- Version Control
  version_number INTEGER DEFAULT 1,
  parent_document_id UUID REFERENCES hrms_documents(document_id),
  
  -- Additional Metadata (JSONB for flexibility)
  metadata JSONB, -- Can store document_number, receipt_number, policy_number, etc.
  
  -- Status
  document_status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'superseded', 'archived'
  
  -- Audit
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date >= start_date),
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('employee', 'project', 'timesheet', 'compliance', 'system'))
);

CREATE INDEX idx_hrms_docs_entity ON hrms_documents(entity_type, entity_id);
CREATE INDEX idx_hrms_docs_checklist ON hrms_documents(checklist_item_id);
CREATE INDEX idx_hrms_docs_type ON hrms_documents(document_type);
CREATE INDEX idx_hrms_docs_expiry ON hrms_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_hrms_docs_compliance ON hrms_documents(compliance_tracking_flag, expiry_date) WHERE compliance_tracking_flag = true;
CREATE INDEX idx_hrms_docs_current ON hrms_documents(is_current_version) WHERE is_current_version = true;

-- Usage Examples:
-- Employee Immigration Doc: entity_type='employee', entity_id=employee_id, document_type='h1b'
-- Project MSA: entity_type='project', entity_id=project_id, document_type='msa'
-- Project PO: entity_type='project', entity_id=project_id, document_type='po'
-- Project COI: entity_type='project', entity_id=project_id, document_type='coi'
-- Timesheet Attachment: entity_type='timesheet', entity_id=timesheet_id, document_type='timesheet'
```

---

## 3. PROJECT MANAGEMENT TABLES

### 3.1 hrms_projects (Employee Projects)
Projects with complex vendor chains and LCA tracking.

```sql
CREATE TABLE hrms_projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Project Details
  project_name VARCHAR(255) NOT NULL,
  project_code VARCHAR(100),
  
  -- Client Information
  end_client_name VARCHAR(255) NOT NULL,
  end_client_id UUID REFERENCES contacts(id), -- Link to CRM
  end_client_manager_name VARCHAR(255),
  end_client_manager_email VARCHAR(255),
  end_client_manager_phone VARCHAR(50),
  end_client_manager_linkedin VARCHAR(255),
  
  -- Location
  work_location_type VARCHAR(50), -- 'onsite', 'hybrid', 'remote'
  physical_location_city_id UUID REFERENCES cities(city_id),
  physical_location_state_id UUID REFERENCES states(state_id),
  physical_location_country_id UUID REFERENCES countries(country_id),
  
  -- Rates & Financials
  actual_client_bill_rate DECIMAL(10,2),
  informed_rate_to_candidate DECIMAL(10,2),
  candidate_percentage DECIMAL(5,2), -- 80%, 70%, etc.
  rate_paid_to_candidate DECIMAL(10,2),
  lca_rate DECIMAL(10,2),
  vms_charges DECIMAL(10,2),
  
  -- Tenure Discounts (5 levels)
  tenure_discount_1 DECIMAL(5,2),
  tenure_discount_1_period VARCHAR(50),
  tenure_discount_2 DECIMAL(5,2),
  tenure_discount_2_period VARCHAR(50),
  tenure_discount_3 DECIMAL(5,2),
  tenure_discount_3_period VARCHAR(50),
  tenure_discount_4 DECIMAL(5,2),
  tenure_discount_4_period VARCHAR(50),
  tenure_discount_5 DECIMAL(5,2),
  tenure_discount_5_period VARCHAR(50),
  current_applicable_tenure_discount DECIMAL(5,2),
  
  -- Volume Discounts (3 levels)
  volume_discount_1 DECIMAL(5,2),
  volume_discount_1_period VARCHAR(50),
  volume_discount_2 DECIMAL(5,2),
  volume_discount_2_period VARCHAR(50),
  volume_discount_3 DECIMAL(5,2),
  volume_discount_3_period VARCHAR(50),
  current_applicable_volume_discount DECIMAL(5,2),
  
  -- LCA Project Flag
  is_lca_project BOOLEAN DEFAULT false,
  public_access_folder_url TEXT,
  
  -- Dates
  project_start_date DATE,
  project_end_date DATE,
  
  -- Status
  project_status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'on_hold', 'cancelled'
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hrms_projects_employee ON hrms_projects(employee_id);
CREATE INDEX idx_hrms_projects_status ON hrms_projects(project_status);
CREATE INDEX idx_hrms_projects_lca ON hrms_projects(is_lca_project) WHERE is_lca_project = true;
CREATE INDEX idx_hrms_projects_dates ON hrms_projects(project_start_date, project_end_date);
```

---

### 3.2 hrms_project_vendors (Vendor Chain)
Supports up to 10 vendors in the chain from employee to end client.

```sql
CREATE TABLE hrms_project_vendors (
  vendor_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  project_id UUID NOT NULL REFERENCES hrms_projects(project_id) ON DELETE CASCADE,
  
  -- Vendor Details
  vendor_level INTEGER NOT NULL CHECK (vendor_level BETWEEN 1 AND 10),
  vendor_name VARCHAR(255) NOT NULL,
  vendor_id UUID REFERENCES contacts(id), -- Link to CRM vendor contact
  
  -- Vendor Contacts
  vendor_ceo_name VARCHAR(255),
  vendor_ceo_email VARCHAR(255),
  vendor_ceo_phone VARCHAR(50),
  
  vendor_hr_name VARCHAR(255),
  vendor_hr_email VARCHAR(255),
  vendor_hr_phone VARCHAR(50),
  
  vendor_finance_name VARCHAR(255),
  vendor_finance_email VARCHAR(255),
  vendor_finance_phone VARCHAR(50),
  
  vendor_invoicing_name VARCHAR(255),
  vendor_invoicing_email VARCHAR(255),
  vendor_invoicing_phone VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_project_vendor_level UNIQUE(project_id, vendor_level)
);

CREATE INDEX idx_hrms_project_vendors_project ON hrms_project_vendors(project_id);
CREATE INDEX idx_hrms_project_vendors_level ON hrms_project_vendors(vendor_level);
```

---

### 3.3 Project Documents via Universal Checklist System

**MSA, PO, and COI documents are now managed through the universal checklist system:**

**Setup Process:**
1. Create checklist template: `checklist_type='msa_po'` or `checklist_type='coi'`
2. Add checklist items: "Master Service Agreement", "Purchase Order", "Certificate of Insurance"
3. Associate documents via `hrms_documents` table with `entity_type='project'`

**Advantages:**
- Unified document management interface
- AI parsing for all project documents
- Automatic compliance tracking
- Version control for MSA/PO/COI renewals
- Flexible metadata storage (document numbers, policy numbers)

**Query Example for Project MSAs:**
```sql
SELECT d.*
FROM hrms_documents d
JOIN hrms_checklist_items ci ON d.checklist_item_id = ci.item_id
JOIN hrms_checklist_templates ct ON ci.template_id = ct.template_id
WHERE d.entity_type = 'project'
  AND d.entity_id = :project_id
  AND ct.checklist_type = 'msa_po'
  AND d.document_type = 'msa'
  AND d.is_current_version = true;
```

---

## 4. TIMESHEET SYSTEM

### 4.1 hrms_timesheets (Employee Time Tracking)

```sql
CREATE TABLE hrms_timesheets (
  timesheet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES hrms_projects(project_id) ON DELETE CASCADE,
  
  -- Timesheet Period
  timesheet_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Hours
  total_hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  submission_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  
  CONSTRAINT valid_period CHECK (period_end_date >= period_start_date)
);

CREATE INDEX idx_hrms_timesheets_employee ON hrms_timesheets(employee_id);
CREATE INDEX idx_hrms_timesheets_project ON hrms_timesheets(project_id);
CREATE INDEX idx_hrms_timesheets_period ON hrms_timesheets(period_start_date, period_end_date);
CREATE INDEX idx_hrms_timesheets_status ON hrms_timesheets(submission_status);
```

---

### 4.2 hrms_timesheet_entries (Daily Time Entries)

```sql
CREATE TABLE hrms_timesheet_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id UUID NOT NULL REFERENCES hrms_timesheets(timesheet_id) ON DELETE CASCADE,
  
  work_date DATE NOT NULL,
  hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0,
  task_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_timesheet_entries_timesheet ON hrms_timesheet_entries(timesheet_id);
CREATE INDEX idx_hrms_timesheet_entries_date ON hrms_timesheet_entries(work_date);
```

---

## 5. VISA & IMMIGRATION

### 5.1 hrms_visa_statuses (Employee Visa History)

```sql
CREATE TABLE hrms_visa_statuses (
  visa_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Visa Details
  visa_type_id INTEGER REFERENCES visa_status(id), -- Link to CRM visa_status lookup
  visa_type_name VARCHAR(100),
  
  -- H1B/Visa Specifics
  receipt_number VARCHAR(100),
  petition_number VARCHAR(100),
  case_number VARCHAR(100),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status
  is_current BOOLEAN DEFAULT false,
  visa_status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'pending', 'cancelled'
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_visa_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_hrms_visa_statuses_employee ON hrms_visa_statuses(employee_id);
CREATE INDEX idx_hrms_visa_statuses_current ON hrms_visa_statuses(is_current) WHERE is_current = true;
CREATE INDEX idx_hrms_visa_statuses_expiry ON hrms_visa_statuses(end_date) WHERE visa_status = 'active';
```

---

### 5.2 hrms_dependents (Employee Dependents)

```sql
CREATE TABLE hrms_dependents (
  dependent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Dependent Info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50), -- 'spouse', 'child', 'parent', etc.
  date_of_birth DATE,
  
  -- Visa/Immigration
  visa_type VARCHAR(100),
  visa_status VARCHAR(50),
  visa_expiry_date DATE,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_dependents_employee ON hrms_dependents(employee_id);
```

---

## 6. COMPLIANCE & REMINDERS

### 6.1 hrms_compliance_items (Compliance Tracking)

```sql
CREATE TABLE hrms_compliance_items (
  compliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Source Document
  document_id UUID REFERENCES hrms_employee_documents(document_id),
  project_id UUID REFERENCES hrms_projects(project_id),
  visa_status_id UUID REFERENCES hrms_visa_statuses(visa_status_id),
  
  -- Compliance Details
  compliance_type VARCHAR(100) NOT NULL, -- 'document_expiry', 'visa_renewal', 'i9_reverify', 'po_extension', 'amendment_required'
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Dates
  due_date DATE NOT NULL,
  completion_date DATE,
  
  -- Status
  compliance_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'overdue', 'waived'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Reminders
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hrms_compliance_employee ON hrms_compliance_items(employee_id);
CREATE INDEX idx_hrms_compliance_status ON hrms_compliance_items(compliance_status);
CREATE INDEX idx_hrms_compliance_due_date ON hrms_compliance_items(due_date) WHERE compliance_status IN ('pending', 'overdue');
CREATE INDEX idx_hrms_compliance_type ON hrms_compliance_items(compliance_type);
```

---

### 6.2 hrms_compliance_reminders (Reminder Configuration)

```sql
CREATE TABLE hrms_compliance_reminders (
  reminder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  compliance_id UUID NOT NULL REFERENCES hrms_compliance_items(compliance_id) ON DELETE CASCADE,
  
  -- Reminder Schedule
  remind_before_days INTEGER NOT NULL, -- Days before due date
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Recipients
  recipient_emails TEXT[], -- Array of email addresses
  recipient_user_ids UUID[], -- Array of user IDs
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_compliance_reminders_compliance ON hrms_compliance_reminders(compliance_id);
CREATE INDEX idx_hrms_compliance_reminders_pending ON hrms_compliance_reminders(reminder_sent) WHERE reminder_sent = false;
```

---

## 7. ADDITIONAL EMPLOYEE TABLES

### 7.1 hrms_employee_resumes (Multiple Resumes)

```sql
CREATE TABLE hrms_employee_resumes (
  resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  resume_title VARCHAR(255),
  technology_focus VARCHAR(255), -- 'Java', '.NET', 'React', 'Nursing', etc.
  
  -- File Storage
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  content_type VARCHAR(100),
  size_bytes BIGINT,
  
  -- Temporal
  version_date DATE,
  is_current BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hrms_resumes_employee ON hrms_employee_resumes(employee_id);
CREATE INDEX idx_hrms_resumes_current ON hrms_employee_resumes(is_current) WHERE is_current = true;
```

---

### 7.2 hrms_background_checks (Background Verification)

```sql
CREATE TABLE hrms_background_checks (
  background_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Verification Company
  verification_company_name VARCHAR(255),
  verification_company_contact VARCHAR(255),
  
  -- Check Details
  check_type VARCHAR(100), -- 'criminal', 'employment', 'education', 'credit', etc.
  check_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  
  -- Dates
  initiated_date DATE,
  completion_date DATE,
  
  -- Results
  result VARCHAR(50), -- 'clear', 'discrepancy', 'issue_found'
  notes TEXT,
  
  -- File Storage
  file_path TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_background_checks_employee ON hrms_background_checks(employee_id);
CREATE INDEX idx_hrms_background_checks_status ON hrms_background_checks(check_status);
```

---

### 7.3 hrms_performance_reports (Performance Reviews)

```sql
CREATE TABLE hrms_performance_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id) ON DELETE CASCADE,
  
  -- Review Details
  review_period_start DATE,
  review_period_end DATE,
  review_year INTEGER,
  
  -- Ratings
  overall_rating DECIMAL(3,2), -- e.g., 4.5 out of 5
  rating_scale VARCHAR(50), -- '1-5', '1-10', 'A-F', etc.
  
  -- Content
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_next_period TEXT,
  reviewer_comments TEXT,
  employee_comments TEXT,
  
  -- Status
  review_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'acknowledged'
  
  -- File Storage
  file_path TEXT,
  
  -- Reviewer
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_performance_employee ON hrms_performance_reports(employee_id);
CREATE INDEX idx_hrms_performance_year ON hrms_performance_reports(review_year);
```

---

## 8. SYSTEM TABLES

### 8.1 hrms_notifications (System Notifications)

```sql
CREATE TABLE hrms_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- Recipient
  user_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES hrms_employees(employee_id),
  
  -- Notification Details
  notification_type VARCHAR(100) NOT NULL, -- 'compliance_reminder', 'document_expiry', 'project_update', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Related Records
  related_entity_type VARCHAR(100), -- 'compliance', 'document', 'project', etc.
  related_entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Action
  action_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_notifications_user ON hrms_notifications(user_id);
CREATE INDEX idx_hrms_notifications_employee ON hrms_notifications(employee_id);
CREATE INDEX idx_hrms_notifications_unread ON hrms_notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_hrms_notifications_type ON hrms_notifications(notification_type);
```

---

### 8.2 hrms_email_templates (Email Templates)

```sql
CREATE TABLE hrms_email_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  template_name VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) UNIQUE NOT NULL, -- 'compliance_reminder', 'welcome_employee', etc.
  
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Variables (JSON array of available placeholders)
  available_variables JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hrms_email_templates_key ON hrms_email_templates(template_key);
```

---

### 8.3 hrms_newsletters (Newsletter Management)

```sql
CREATE TABLE hrms_newsletters (
  newsletter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  business_id UUID REFERENCES businesses(business_id),
  
  title VARCHAR(255) NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT,
  
  -- Audience
  target_employee_types VARCHAR(50)[], -- Array of employee types
  target_employees UUID[], -- Specific employee IDs
  
  -- Scheduling
  scheduled_send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  
  -- Status
  newsletter_status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent'
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_hrms_newsletters_status ON hrms_newsletters(newsletter_status);
CREATE INDEX idx_hrms_newsletters_scheduled ON hrms_newsletters(scheduled_send_at);
```

---

### 8.4 hrms_suggestions (Ideas & Suggestions)

```sql
CREATE TABLE hrms_suggestions (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- Submitted By
  submitted_by_user_id UUID REFERENCES auth.users(id),
  submitted_by_employee_id UUID REFERENCES hrms_employees(employee_id),
  
  suggestion_type VARCHAR(50), -- 'feature', 'improvement', 'bug_report', 'feedback'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'approved', 'rejected', 'implemented'
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Admin Response
  admin_response TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_suggestions_status ON hrms_suggestions(status);
CREATE INDEX idx_hrms_suggestions_type ON hrms_suggestions(suggestion_type);
```

---

### 8.5 hrms_issue_reports (Issue Tracking)

```sql
CREATE TABLE hrms_issue_reports (
  issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- Reported By
  reported_by_user_id UUID REFERENCES auth.users(id),
  reported_by_employee_id UUID REFERENCES hrms_employees(employee_id),
  
  issue_type VARCHAR(50), -- 'bug', 'error', 'access_issue', 'data_issue', 'other'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  
  -- Environment
  browser VARCHAR(100),
  os VARCHAR(100),
  screenshot_paths TEXT[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed', 'wont_fix'
  
  -- Resolution
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrms_issues_status ON hrms_issue_reports(status);
CREATE INDEX idx_hrms_issues_severity ON hrms_issue_reports(severity);
```

---

## 9. CRM-HRMS BRIDGE

### 9.1 crm_hrms_contact_bridge (Cross-Database Link)
This table should be created in BOTH databases for bidirectional sync.

**In CRM Database:**
```sql
CREATE TABLE crm_hrms_contact_bridge (
  bridge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- CRM Side
  crm_contact_id UUID NOT NULL REFERENCES contacts(id),
  contact_type VARCHAR(50),
  
  -- HRMS Side (UUID reference to HRMS database)
  hrms_employee_id UUID NOT NULL,
  
  -- Sync Status
  sync_status VARCHAR(50) DEFAULT 'active',
  sync_date TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_crm_contact UNIQUE(crm_contact_id)
);
```

**In HRMS Database (mirror for quick lookup):**
```sql
CREATE TABLE hrms_crm_bridge (
  bridge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
  
  -- HRMS Side
  hrms_employee_id UUID NOT NULL REFERENCES hrms_employees(employee_id),
  
  -- CRM Side (UUID reference to CRM database)
  crm_contact_id UUID NOT NULL,
  
  sync_status VARCHAR(50) DEFAULT 'active',
  sync_date TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_hrms_employee UNIQUE(hrms_employee_id)
);
```

---

## 10. ROW LEVEL SECURITY (RLS)

All tables must have RLS enabled with tenant isolation:

```sql
-- Example for hrms_employees
ALTER TABLE hrms_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON hrms_employees
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_insert_policy ON hrms_employees
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_update_policy ON hrms_employees
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY tenant_delete_policy ON hrms_employees
  FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Apply similar RLS policies to ALL hrms_* tables.**

---

## 11. DATABASE FUNCTIONS & TRIGGERS

### 11.1 Auto-create Compliance Items

```sql
CREATE OR REPLACE FUNCTION fn_create_compliance_from_document()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.expiry_date IS NOT NULL OR NEW.compliance_tracking_flag = true) AND NEW.document_status = 'active' THEN
    INSERT INTO hrms_compliance_items (
      tenant_id,
      business_id,
      employee_id,
      document_id,
      compliance_type,
      item_name,
      description,
      due_date,
      priority
    ) VALUES (
      NEW.tenant_id,
      NEW.business_id,
      NEW.employee_id,
      NEW.document_id,
      'document_expiry',
      NEW.document_name || ' - Renewal Required',
      'Document ' || NEW.document_name || ' is expiring soon',
      COALESCE(NEW.expiry_date - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days'),
      CASE 
        WHEN NEW.expiry_date IS NULL THEN 'medium'
        WHEN NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
        WHEN NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_compliance_from_document
  AFTER INSERT ON hrms_employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_compliance_from_document();
```

---

### 11.2 Update Timestamps

```sql
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER trg_update_timestamp
  BEFORE UPDATE ON hrms_employees
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_timestamp();

-- Repeat for other tables...
```

---

### 11.3 Trigger Amendment Required Alert

```sql
CREATE OR REPLACE FUNCTION fn_check_project_amendment_required()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_visa_status VARCHAR(50);
  v_existing_lca_project_count INTEGER;
BEGIN
  -- Check if employee is on visa
  SELECT visa_status INTO v_employee_visa_status
  FROM hrms_visa_statuses
  WHERE employee_id = NEW.employee_id AND is_current = true
  LIMIT 1;
  
  -- If on visa and this is a new LCA project
  IF v_employee_visa_status IN ('H1B', 'L1') AND NEW.is_lca_project = true THEN
    -- Check if employee already has an active LCA project
    SELECT COUNT(*) INTO v_existing_lca_project_count
    FROM hrms_projects
    WHERE employee_id = NEW.employee_id 
      AND is_lca_project = true 
      AND project_status = 'active'
      AND project_id != NEW.project_id;
    
    -- If already has LCA project, trigger amendment
    IF v_existing_lca_project_count > 0 THEN
      INSERT INTO hrms_compliance_items (
        tenant_id,
        business_id,
        employee_id,
        project_id,
        compliance_type,
        item_name,
        description,
        due_date,
        priority
      ) VALUES (
        NEW.tenant_id,
        NEW.business_id,
        NEW.employee_id,
        NEW.project_id,
        'amendment_required',
        'H1B Amendment Required',
        'New LCA project added for visa holder - Amendment process required',
        CURRENT_DATE + INTERVAL '7 days',
        'high'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_project_amendment
  AFTER INSERT OR UPDATE ON hrms_projects
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_project_amendment_required();
```

---

## 12. VIEWS

### 12.1 Active Employees with Current Details

```sql
CREATE VIEW v_hrms_employees_full AS
SELECT 
  e.*,
  a.street_address_1,
  a.city_id,
  c.name as city_name,
  s.name as state_name,
  co.name as country_name,
  v.visa_type_name as current_visa_type,
  v.end_date as visa_expiry_date,
  jt.job_title
FROM hrms_employees e
LEFT JOIN hrms_employee_addresses a ON e.employee_id = a.employee_id AND a.is_current = true
LEFT JOIN cities c ON a.city_id = c.city_id
LEFT JOIN states s ON a.state_id = s.state_id
LEFT JOIN countries co ON a.country_id = co.country_id
LEFT JOIN hrms_visa_statuses v ON e.employee_id = v.employee_id AND v.is_current = true
LEFT JOIN job_title jt ON e.job_title_id = jt.id
WHERE e.is_active = true AND e.deleted_at IS NULL;
```

---

### 12.2 Compliance Dashboard

```sql
CREATE VIEW v_hrms_compliance_dashboard AS
SELECT 
  e.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.employee_type,
  e.employment_status,
  COUNT(CASE WHEN c.compliance_status = 'pending' THEN 1 END) as pending_items,
  COUNT(CASE WHEN c.compliance_status = 'overdue' THEN 1 END) as overdue_items,
  COUNT(CASE WHEN c.due_date <= CURRENT_DATE + INTERVAL '7 days' AND c.compliance_status = 'pending' THEN 1 END) as due_within_week,
  COUNT(CASE WHEN c.priority = 'critical' THEN 1 END) as critical_items
FROM hrms_employees e
LEFT JOIN hrms_compliance_items c ON e.employee_id = c.employee_id AND c.compliance_status IN ('pending', 'overdue')
WHERE e.employment_status = 'active'
GROUP BY e.employee_id, e.first_name, e.last_name, e.employee_type, e.employment_status;
```

---

### 12.3 Project Vendor Chain View

```sql
CREATE VIEW v_hrms_project_vendor_chain AS
SELECT 
  p.project_id,
  p.project_name,
  p.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  p.end_client_name,
  string_agg(
    'V' || pv.vendor_level || ': ' || pv.vendor_name, 
    ' → ' 
    ORDER BY pv.vendor_level DESC
  ) as vendor_chain
FROM hrms_projects p
JOIN hrms_employees e ON p.employee_id = e.employee_id
LEFT JOIN hrms_project_vendors pv ON p.project_id = pv.project_id
GROUP BY p.project_id, p.project_name, p.employee_id, e.first_name, e.last_name, p.end_client_name;
```

---

## 13. SUMMARY

### Table Count: 26 Core Tables (Reduced from 29)
1. hrms_employees
2. hrms_employee_addresses
3. hrms_checklist_templates (**ENHANCED:** Universal checklist system)
4. hrms_checklist_groups
5. hrms_checklist_items
6. hrms_documents (**RENAMED & ENHANCED:** Was hrms_employee_documents, now universal)
7. hrms_projects
8. hrms_project_vendors
9. ~~hrms_project_msa_po~~ (**REMOVED:** Now via checklist)
10. ~~hrms_project_coi~~ (**REMOVED:** Now via checklist)
11. hrms_timesheets
12. hrms_timesheet_entries
13. hrms_visa_statuses
14. hrms_dependents
15. hrms_compliance_items
16. hrms_compliance_reminders
17. hrms_employee_resumes
18. hrms_background_checks
19. hrms_performance_reports
20. hrms_notifications
21. hrms_email_templates
22. hrms_newsletters
23. hrms_suggestions
24. hrms_issue_reports
25. hrms_crm_bridge
26. Bridge tables (in both databases)

### Key Architectural Improvements
- ✅ **Universal Checklist System:** Single architecture for ALL document types (immigration, project, timesheet, compliance)
- ✅ **Polymorphic Document Storage:** `hrms_documents` table supports employee, project, timesheet, and compliance contexts
- ✅ **Reduced Complexity:** Eliminated 3 specialized tables (MSA/PO/COI) in favor of flexible checklist approach
- ✅ **Scalability:** Easy to add new document types without schema changes

### Key Features
- ✅ Multi-tenant with RLS
- ✅ Complete audit trail
- ✅ Document version control
- ✅ AI-powered document parsing (OpenRouter Claude)
- ✅ **Universal checklist system for ALL documents**
- ✅ **Polymorphic document storage (employee, project, timesheet, compliance)**
- ✅ Complex vendor chain tracking (up to 10 levels)
- ✅ Comprehensive compliance management
- ✅ Time-based address history
- ✅ Timesheet management
- ✅ CRM integration bridge
- ✅ Automated reminders
- ✅ Newsletter system
- ✅ Suggestions & issue tracking

---

**Status:** Ready for Review & Migration Development
**Next Phase:** Create Supabase migrations in sequential order
