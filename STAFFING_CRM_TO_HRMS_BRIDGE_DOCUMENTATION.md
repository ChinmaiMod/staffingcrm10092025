# Staffing CRM to HRMS Integration - Key Takeaways & Architecture Guide

## 📋 Executive Summary

This document captures the essential architectural patterns, design decisions, and implementation details from the **Staffing CRM** system to guide the development of a companion **Staffing HRMS** that will integrate seamlessly with the existing CRM infrastructure.

---

## 🎯 Core Architecture Principles

### 1. Multi-Tenant SaaS Foundation

**Key Takeaway:** Every table must have `tenant_id` for complete data isolation.

```sql
-- Standard table structure
CREATE TABLE hrms_employees (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  -- other fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);
```

**Implementation Pattern:**
- ✅ **ALL tables MUST include `tenant_id`** - This is the primary multi-tenancy isolation mechanism
- ✅ **ALL transactional tables SHOULD include `business_id`** - Enables multi-business support within a tenant
- ✅ **Exceptions:** System-wide reference tables (roles, menu_permissions) don't need tenant_id/business_id
- ✅ RLS policies filter by `auth.jwt() ->> 'sub'` to enforce tenant isolation
- ✅ Cascading deletes ensure data cleanup on tenant removal
- ✅ Updated timestamps managed via triggers
- ✅ All foreign key references include appropriate ON DELETE actions

**Critical Rules:**
1. **tenant_id**: NOT NULL, references tenants(id) ON DELETE CASCADE
2. **business_id**: NULL allowed (for tenant-wide data), references businesses(id) ON DELETE SET NULL
3. **Indexes**: Always create indexes on tenant_id and business_id for query performance
4. **Audit fields**: created_at, updated_at, created_by, updated_by on all tables

### 2. Row Level Security (RLS) Enforcement

**Key Takeaway:** Every table needs comprehensive RLS policies for SELECT, INSERT, UPDATE, DELETE.

```sql
-- Example RLS policy pattern
ALTER TABLE hrms_employees ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view employees from their tenant
CREATE POLICY "Users can view employees from their tenant"
  ON hrms_employees FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- INSERT: Users can create employees for their tenant
CREATE POLICY "Users can create employees for their tenant"
  ON hrms_employees FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

**RLS Policy Categories Needed:**
1. **Tenant-scoped policies** - Basic read/write for tenant members
2. **Business-scoped policies** - Filter data by business_id when applicable
3. **Role-based policies** - Additional restrictions based on user role
4. **Super admin policies** - Unrestricted access for system administrators

### 3. Business Hierarchy Support

**Key Takeaway:** Support multiple businesses under one tenant (e.g., IT Division, Healthcare Division).

**Database Pattern:**
```sql
-- Businesses table (already exists in CRM)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  business_name TEXT NOT NULL,
  division_type TEXT CHECK (division_type IN ('IT', 'Healthcare')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- All HRMS tables should support business_id
ALTER TABLE hrms_employees ADD COLUMN business_id UUID REFERENCES businesses(id);
ALTER TABLE hrms_departments ADD COLUMN business_id UUID REFERENCES businesses(id);
ALTER TABLE hrms_positions ADD COLUMN business_id UUID REFERENCES businesses(id);
```

**UI Pattern:**
- Business selector dropdown at top of interface
- Filter data by selected business
- Global option to view across all businesses (for CEO/Admin roles)

---

## 🗄️ Database Design Patterns

### 1. Lookup Tables (Reference Data)

**Key Takeaway:** Use tenant-scoped lookup tables for standardized values with optional business scoping.

**Pattern from CRM:**
```sql
-- Example: Employment Types
CREATE TABLE employment_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL, -- Optional: business-specific types
  employment_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint per tenant/business
CREATE UNIQUE INDEX idx_employment_types_unique 
  ON employment_types(tenant_id, LOWER(employment_type), COALESCE(business_id, '00000000-0000-0000-0000-000000000000'));

-- Indexes for performance
CREATE INDEX idx_employment_types_tenant ON employment_types(tenant_id);
CREATE INDEX idx_employment_types_business ON employment_types(business_id);
```

**HRMS Lookup Tables Needed:**

All lookup tables follow the same pattern with tenant_id, business_id, and proper indexing:

```sql
-- Departments
CREATE TABLE departments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  department_name TEXT NOT NULL,
  department_code TEXT,
  parent_department_id BIGINT REFERENCES departments(id),
  manager_id BIGINT REFERENCES hrms_employees(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_business ON departments(business_id);

-- Job Levels
CREATE TABLE job_levels (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  level_name TEXT NOT NULL,
  level_order INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_job_levels_tenant ON job_levels(tenant_id);
CREATE INDEX idx_job_levels_business ON job_levels(business_id);

-- Office Locations
CREATE TABLE office_locations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city_id BIGINT REFERENCES cities(id),
  state_id BIGINT REFERENCES states(id),
  country_id BIGINT REFERENCES countries(id),
  postal_code TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_office_locations_tenant ON office_locations(tenant_id);
CREATE INDEX idx_office_locations_business ON office_locations(business_id);

-- Benefit Types
CREATE TABLE benefit_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  benefit_name TEXT NOT NULL,
  benefit_category TEXT, -- 'health', 'retirement', 'insurance', 'time_off', 'other'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_benefit_types_tenant ON benefit_types(tenant_id);
CREATE INDEX idx_benefit_types_business ON benefit_types(business_id);

-- Leave Types
CREATE TABLE leave_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  leave_type_name TEXT NOT NULL,
  default_days_per_year INTEGER,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_leave_types_tenant ON leave_types(tenant_id);
CREATE INDEX idx_leave_types_business ON leave_types(business_id);

-- Document Types
CREATE TABLE document_types (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  document_type_name TEXT NOT NULL,
  document_category TEXT, -- 'onboarding', 'compliance', 'performance', 'other'
  is_required BOOLEAN DEFAULT false,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_document_types_tenant ON document_types(tenant_id);
CREATE INDEX idx_document_types_business ON document_types(business_id);
```

**Key Points:**
- ✅ `employment_types` (Full-time, Part-time, Contract, Internship)
- ✅ `departments` (Engineering, Sales, HR, Finance, etc.)
- ✅ `job_levels` (Junior, Mid, Senior, Lead, Manager, Director)
- ✅ `office_locations` (linked to cities table)
- ✅ `benefit_types` (Health Insurance, 401k, PTO, etc.)
- ✅ `leave_types` (Vacation, Sick, Personal, Parental)
- ✅ `document_types` (I9, W4, Offer Letter, NDA, etc.)

### 2. Audit Trail Pattern

**Key Takeaway:** Maintain history tables for critical changes with status transitions.

**Pattern from CRM (contact_status_history):**
```sql
CREATE TABLE employee_status_history (
  history_id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT NOT NULL REFERENCES hrms_employees(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT, -- Mandatory for status changes
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying history
CREATE INDEX idx_employee_status_history_employee 
  ON employee_status_history(employee_id);
CREATE INDEX idx_employee_status_history_tenant 
  ON employee_status_history(tenant_id);
CREATE INDEX idx_employee_status_history_business 
  ON employee_status_history(business_id);
```

**Apply to:**
- Employment status changes (Active → On Leave → Terminated)
- Salary/compensation changes
- Position/department transfers
- Performance review history

### 3. Document Attachment Pattern

**Key Takeaway:** Store file metadata in database, actual files in Supabase Storage.

**Pattern from CRM (contact_attachments):**
```sql
CREATE TABLE employee_documents (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT NOT NULL REFERENCES hrms_employees(id) ON DELETE CASCADE,
  document_type_id BIGINT REFERENCES document_types(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path: tenant_id/business_id/employees/employee_id/filename
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employee_documents_tenant ON employee_documents(tenant_id);
CREATE INDEX idx_employee_documents_business ON employee_documents(business_id);
CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
```

**Storage Bucket Structure:**
```
employee-documents/
├── {tenant_id}/
│   ├── {business_id}/
│   │   ├── {employee_id}/
│   │   │   ├── offer_letter_2024.pdf
│   │   │   ├── i9_form.pdf
│   │   │   ├── w4_form.pdf
│   │   │   └── nda_signed.pdf
```

**Security:**
- RLS policies on storage bucket
- Signed URLs with expiration for secure downloads
- File size limits enforced

### 4. Core HRMS Transactional Tables

**Key Takeaway:** All transactional tables MUST include tenant_id and business_id for proper multi-tenancy support.

```sql
-- Payroll Runs
CREATE TABLE payroll_runs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'
  total_amount DECIMAL(15,2),
  processed_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payroll_runs_tenant ON payroll_runs(tenant_id);
CREATE INDEX idx_payroll_runs_business ON payroll_runs(business_id);
CREATE INDEX idx_payroll_runs_dates ON payroll_runs(pay_period_start, pay_period_end);

-- Employee Payroll Details (per payroll run)
CREATE TABLE employee_payroll_details (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  payroll_run_id BIGINT REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  gross_pay DECIMAL(10,2),
  deductions DECIMAL(10,2),
  net_pay DECIMAL(10,2),
  tax_withheld DECIMAL(10,2),
  hours_worked DECIMAL(8,2),
  overtime_hours DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employee_payroll_tenant ON employee_payroll_details(tenant_id);
CREATE INDEX idx_employee_payroll_business ON employee_payroll_details(business_id);
CREATE INDEX idx_employee_payroll_run ON employee_payroll_details(payroll_run_id);
CREATE INDEX idx_employee_payroll_employee ON employee_payroll_details(employee_id);

-- Time Off Requests
CREATE TABLE time_off_requests (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  leave_type_id BIGINT REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2),
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
  reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  approval_date TIMESTAMPTZ,
  approval_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_time_off_tenant ON time_off_requests(tenant_id);
CREATE INDEX idx_time_off_business ON time_off_requests(business_id);
CREATE INDEX idx_time_off_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_status ON time_off_requests(status);
CREATE INDEX idx_time_off_dates ON time_off_requests(start_date, end_date);

-- Employee Benefits Enrollment
CREATE TABLE employee_benefits (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  benefit_type_id BIGINT REFERENCES benefit_types(id),
  enrollment_date DATE NOT NULL,
  coverage_start_date DATE,
  coverage_end_date DATE,
  employee_contribution DECIMAL(10,2),
  employer_contribution DECIMAL(10,2),
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING', 'TERMINATED'
  beneficiary_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employee_benefits_tenant ON employee_benefits(tenant_id);
CREATE INDEX idx_employee_benefits_business ON employee_benefits(business_id);
CREATE INDEX idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX idx_employee_benefits_status ON employee_benefits(status);

-- Performance Reviews
CREATE TABLE performance_reviews (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  reviewer_id BIGINT REFERENCES hrms_employees(id),
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_date DATE,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'COMPLETED'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_performance_reviews_tenant ON performance_reviews(tenant_id);
CREATE INDEX idx_performance_reviews_business ON performance_reviews(business_id);
CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);

-- Employee Compensation History
CREATE TABLE compensation_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  old_salary DECIMAL(12,2),
  new_salary DECIMAL(12,2),
  salary_type TEXT, -- 'HOURLY', 'ANNUAL'
  change_reason TEXT, -- 'PROMOTION', 'ANNUAL_REVIEW', 'MARKET_ADJUSTMENT', 'OTHER'
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_compensation_history_tenant ON compensation_history(tenant_id);
CREATE INDEX idx_compensation_history_business ON compensation_history(business_id);
CREATE INDEX idx_compensation_history_employee ON compensation_history(employee_id);
CREATE INDEX idx_compensation_history_date ON compensation_history(effective_date);

-- Employee Attendance
CREATE TABLE employee_attendance (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  status TEXT, -- 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employee_attendance_tenant ON employee_attendance(tenant_id);
CREATE INDEX idx_employee_attendance_business ON employee_attendance(business_id);
CREATE INDEX idx_employee_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX idx_employee_attendance_date ON employee_attendance(attendance_date);

-- Training & Certifications
CREATE TABLE employee_training (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT, -- 'CERTIFICATION', 'COURSE', 'WORKSHOP', 'CONFERENCE'
  provider TEXT,
  completion_date DATE,
  expiry_date DATE,
  certification_number TEXT,
  cost DECIMAL(10,2),
  status TEXT DEFAULT 'IN_PROGRESS', -- 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employee_training_tenant ON employee_training(tenant_id);
CREATE INDEX idx_employee_training_business ON employee_training(business_id);
CREATE INDEX idx_employee_training_employee ON employee_training(employee_id);
CREATE INDEX idx_employee_training_expiry ON employee_training(expiry_date);
```

**All Transactional Tables Include:**
- ✅ `tenant_id UUID NOT NULL` - Mandatory for multi-tenancy
- ✅ `business_id UUID` - Optional for business-level filtering
- ✅ Proper cascading deletes (ON DELETE CASCADE/SET NULL)
- ✅ Indexes on tenant_id, business_id, and frequently queried columns
- ✅ Audit timestamps (created_at, updated_at)
- ✅ Status fields with meaningful enum values

---

## 🔗 CRM-HRMS Integration Points

### 1. Contact to Employee Conversion

**Key Takeaway:** When a candidate (contact) is hired, create linked employee record.

**Database Schema:**
```sql
-- Link table
CREATE TABLE contact_employee_links (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  conversion_date TIMESTAMPTZ DEFAULT NOW(),
  converted_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contact_employee_links_tenant ON contact_employee_links(tenant_id);
CREATE INDEX idx_contact_employee_links_business ON contact_employee_links(business_id);
CREATE INDEX idx_contact_employee_links_contact ON contact_employee_links(contact_id);
CREATE INDEX idx_contact_employee_links_employee ON contact_employee_links(employee_id);

-- Employee table includes optional contact reference
ALTER TABLE hrms_employees 
  ADD COLUMN source_contact_id BIGINT REFERENCES contacts(id);
```

**Conversion Workflow:**
1. Contact marked as "Placed into Job" in CRM
2. User clicks "Convert to Employee" button
3. System creates employee record with pre-filled data:
   - Name, email, phone from contact
   - Links original contact for reference
   - Triggers onboarding workflow

**Data to Transfer:**
- ✅ Personal info (name, email, phone)
- ✅ Address (country, state, city)
- ✅ Visa status (for immigration tracking)
- ✅ Job title
- ✅ Resume/attachments
- ✅ Recruiter assignment

### 2. Shared Reference Tables

**Key Takeaway:** Reuse CRM lookup tables where applicable to maintain consistency.

**Tables to Share Between CRM & HRMS:**
- ✅ `visa_statuses` - Immigration status tracking
- ✅ `job_titles` - Consistent job title taxonomy
- ✅ `countries`, `states`, `cities` - Geographic data
- ✅ `businesses` - Division/business unit structure

**Implementation:**
```sql
-- HRMS references CRM tables
ALTER TABLE hrms_employees 
  ADD COLUMN visa_status_id BIGINT REFERENCES visa_statuses(id),
  ADD COLUMN job_title_id BIGINT REFERENCES job_titles(id),
  ADD COLUMN country_id BIGINT REFERENCES countries(id);
```

### 3. Team/Recruiter Relationship Preservation

**Key Takeaway:** Maintain the recruiting team relationship when converting to employee.

**Schema:**
```sql
-- Track who recruited this employee
ALTER TABLE hrms_employees 
  ADD COLUMN recruited_by_team_id BIGINT REFERENCES teams(id),
  ADD COLUMN primary_recruiter_id BIGINT REFERENCES team_members(id);

-- Optional: Commission tracking
CREATE TABLE recruitment_commissions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  team_member_id BIGINT REFERENCES team_members(id) ON DELETE SET NULL,
  commission_amount DECIMAL(10,2),
  commission_type TEXT, -- 'placement', 'retention_milestone'
  earned_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  status TEXT, -- 'pending', 'approved', 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recruitment_commissions_tenant ON recruitment_commissions(tenant_id);
CREATE INDEX idx_recruitment_commissions_business ON recruitment_commissions(business_id);
CREATE INDEX idx_recruitment_commissions_employee ON recruitment_commissions(employee_id);
CREATE INDEX idx_recruitment_commissions_team_member ON recruitment_commissions(team_member_id);
```

---

## 👥 Role-Based Access Control (RBAC)

### 1. Role Hierarchy

**Key Takeaway:** Use 5-level hierarchical role system with subordinate access.

**From CRM:**
```sql
-- Role levels
CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  role_name TEXT UNIQUE NOT NULL,
  role_level INTEGER NOT NULL, -- 1-5
  description TEXT
);

-- Levels:
-- 1: Read-only (View only, no edits)
-- 2: Team Member (Edit own data)
-- 3: Team Lead (Manage team)
-- 4: Manager (Manage multiple teams)
-- 5: CEO/Super Admin (Full access)
```

**HRMS Role Extensions:**
```sql
-- Additional HRMS-specific roles
INSERT INTO roles (role_name, role_level, description) VALUES
('HR_ADMINISTRATOR', 4, 'Full HR system access'),
('PAYROLL_ADMIN', 4, 'Payroll and compensation access'),
('BENEFITS_ADMIN', 3, 'Benefits management access'),
('EMPLOYEE', 1, 'Employee self-service only');

-- Employee role assignments
CREATE TABLE employee_role_assignments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  employee_id BIGINT REFERENCES hrms_employees(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_employee_role_assignments_tenant ON employee_role_assignments(tenant_id);
CREATE INDEX idx_employee_role_assignments_business ON employee_role_assignments(business_id);
CREATE INDEX idx_employee_role_assignments_employee ON employee_role_assignments(employee_id);
CREATE INDEX idx_employee_role_assignments_role ON employee_role_assignments(role_id);
```

### 2. Menu Permissions

**Key Takeaway:** Control UI navigation visibility based on role permissions.

**Pattern from CRM:**
```sql
CREATE TABLE hrms_menu_permissions (
  id BIGSERIAL PRIMARY KEY,
  menu_name TEXT NOT NULL, -- 'employees', 'payroll', 'benefits', 'time_off'
  role_id BIGINT REFERENCES roles(id),
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false
);

-- Example permissions
INSERT INTO hrms_menu_permissions (menu_name, role_id, can_view, can_create, can_edit, can_delete) VALUES
('payroll', (SELECT id FROM roles WHERE role_name = 'PAYROLL_ADMIN'), true, true, true, true),
('payroll', (SELECT id FROM roles WHERE role_name = 'EMPLOYEE'), true, false, false, false);
```

**Frontend Implementation:**
```javascript
// React context provider
const usePermissions = () => {
  const { userRoles } = useAuth();
  
  const hasPermission = (menu, action) => {
    return menuPermissions[menu]?.[action] || false;
  };
  
  return { hasPermission };
};

// Usage in components
const EmployeeList = () => {
  const { hasPermission } = usePermissions();
  
  return (
    <>
      {hasPermission('employees', 'can_create') && (
        <button onClick={handleCreateEmployee}>Add Employee</button>
      )}
    </>
  );
};
```

---

## 🔐 Security Best Practices

### 1. Supabase Edge Functions for Sensitive Operations

**Key Takeaway:** Never perform sensitive operations directly from frontend.

**Operations Requiring Edge Functions:**
- ✅ Payroll calculations
- ✅ Salary changes
- ✅ SSN/Tax ID encryption/decryption
- ✅ Background check integrations
- ✅ Bulk data exports with PII

**Pattern:**
```typescript
// Edge Function: calculatePayroll
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Server-side auth
  );
  
  // Verify user has permission
  const { data: { user } } = await supabase.auth.getUser(authHeader);
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  // Perform secure operation
  const payrollData = await calculateEmployeePayroll(user.tenant_id);
  
  return new Response(JSON.stringify(payrollData), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 2. PII Data Protection

**Key Takeaway:** Encrypt sensitive personally identifiable information.

**Sensitive Fields:**
- SSN/National ID
- Bank account numbers
- Date of birth (in some jurisdictions)
- Salary information
- Medical records

**Implementation Options:**

**Option A: Postgres pgcrypto Extension**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store encrypted SSN
CREATE TABLE hrms_employees (
  id BIGSERIAL PRIMARY KEY,
  -- ... other fields
  ssn_encrypted BYTEA, -- Encrypted using AES
  dob_encrypted BYTEA
);

-- Insert with encryption
INSERT INTO hrms_employees (ssn_encrypted) 
VALUES (pgp_sym_encrypt('123-45-6789', 'encryption-key'));

-- Decrypt (via Edge Function only)
SELECT pgp_sym_decrypt(ssn_encrypted, 'encryption-key') FROM hrms_employees;
```

**Option B: Vault Service (Recommended)**
- Use external secrets management (HashiCorp Vault, AWS Secrets Manager)
- Store only tokenized references in database
- Retrieve actual values via secure API calls

### 3. Audit Logging

**Key Takeaway:** Log all sensitive data access and modifications.

**Enhanced Audit Pattern:**
```sql
CREATE TABLE hrms_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'export'
  table_name TEXT NOT NULL,
  record_id BIGINT,
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hrms_audit_logs_tenant ON hrms_audit_logs(tenant_id);
CREATE INDEX idx_hrms_audit_logs_business ON hrms_audit_logs(business_id);
CREATE INDEX idx_hrms_audit_logs_user ON hrms_audit_logs(user_id);
CREATE INDEX idx_hrms_audit_logs_table ON hrms_audit_logs(table_name);
CREATE INDEX idx_hrms_audit_logs_created ON hrms_audit_logs(created_at);

-- Trigger for automatic logging
CREATE TRIGGER audit_employee_changes
  AFTER UPDATE ON hrms_employees
  FOR EACH ROW
  EXECUTE FUNCTION log_employee_changes();
```

---

## 📧 Email & Notification System

### 1. Email Template System

**Key Takeaway:** Reuse CRM email template system for HR notifications.

**Template Categories for HRMS:**
```sql
-- Add HRMS-specific template types
INSERT INTO email_templates (tenant_id, template_name, subject, body, category) VALUES
(tenant_id, 'employee_onboarding_welcome', 
  'Welcome to {{company_name}}!',
  'Dear {{employee_name}}, ...',
  'ONBOARDING'),
  
(tenant_id, 'benefits_enrollment_reminder',
  'Reminder: Benefits Enrollment Deadline {{deadline}}',
  'Hi {{employee_name}}, ...',
  'BENEFITS'),
  
(tenant_id, 'performance_review_scheduled',
  'Performance Review Scheduled',
  'Your review is scheduled for {{review_date}}...',
  'PERFORMANCE');
```

**Variable Replacement:**
```javascript
const sendTemplatedEmail = async (templateName, recipientEmail, variables) => {
  const template = await getTemplate(templateName);
  
  let emailBody = template.body;
  let emailSubject = template.subject;
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    emailBody = emailBody.replace(regex, value);
    emailSubject = emailSubject.replace(regex, value);
  });
  
  // Send via Resend API
  await sendEmail({ to: recipientEmail, subject: emailSubject, body: emailBody });
};
```

### 2. Scheduled Notifications

**Key Takeaway:** Use scheduled_notifications table for recurring HR reminders.

**HRMS Use Cases:**
- 📅 Annual performance review reminders
- 📅 Benefits enrollment windows
- 📅 Probation period ending alerts
- 📅 Certification expiration warnings
- 📅 Birthday/anniversary wishes

**Pattern:**
```sql
-- Reuse CRM scheduled_notifications table
INSERT INTO scheduled_notifications (
  tenant_id, business_id, notification_type, 
  recipient_email, subject, body,
  frequency, next_send_date, is_active
) VALUES (
  tenant_id, business_id, 'BENEFITS_REMINDER',
  'employee@example.com',
  'Benefits Enrollment Window Opens Soon',
  'Reminder: Open enrollment starts on Nov 1st...',
  'YEARLY', -- or 'MONTHLY', 'WEEKLY', 'ONCE'
  '2025-10-15 09:00:00',
  true
);
```

---

## 🎨 Frontend Architecture

### 1. React Context Providers

**Key Takeaway:** Centralize state management with context providers.

**Required Contexts for HRMS:**
```javascript
// 1. AuthProvider (reuse from CRM)
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Auth methods
  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 2. TenantProvider (reuse from CRM)
const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  
  return (
    <TenantContext.Provider value={{ tenant, subscription, selectedBusiness }}>
      {children}
    </TenantContext.Provider>
  );
};

// 3. NEW: HRMSProvider (employee-specific state)
const HRMSProvider = ({ children }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  
  return (
    <HRMSContext.Provider value={{ 
      selectedEmployee, setSelectedEmployee,
      departments, employmentTypes 
    }}>
      {children}
    </HRMSContext.Provider>
  );
};
```

### 2. Component Organization

**Recommended Structure:**
```
src/
├── components/
│   ├── HRMS/
│   │   ├── Dashboard/
│   │   │   ├── HRMSDashboard.jsx
│   │   │   └── Dashboard.css
│   │   ├── Employees/
│   │   │   ├── EmployeeList.jsx
│   │   │   ├── EmployeeForm.jsx
│   │   │   ├── EmployeeDetail.jsx
│   │   │   └── EmployeeCard.jsx
│   │   ├── Payroll/
│   │   │   ├── PayrollDashboard.jsx
│   │   │   ├── PayrollRun.jsx
│   │   │   └── PayslipGenerator.jsx
│   │   ├── Benefits/
│   │   │   ├── BenefitsList.jsx
│   │   │   ├── EnrollmentForm.jsx
│   │   │   └── BenefitsCard.jsx
│   │   ├── TimeOff/
│   │   │   ├── TimeOffRequests.jsx
│   │   │   ├── LeaveCalendar.jsx
│   │   │   └── LeaveBalance.jsx
│   │   └── Onboarding/
│   │       ├── OnboardingChecklist.jsx
│   │       ├── DocumentUpload.jsx
│   │       └── OnboardingWorkflow.jsx
│   ├── Shared/ (reuse from CRM)
│   │   ├── AutocompleteSelect.jsx
│   │   ├── DataTable.jsx
│   │   ├── FilterBar.jsx
│   │   └── StatusBadge.jsx
│   └── Auth/ (reuse from CRM)
├── api/
│   ├── supabaseClient.js (reuse)
│   ├── edgeFunctions.js (extend with HRMS functions)
│   └── hrmsApi.js (new)
└── contexts/
    ├── AuthProvider.jsx (reuse)
    ├── TenantProvider.jsx (reuse)
    └── HRMSProvider.jsx (new)
```

### 3. Data Table Pattern

**Key Takeaway:** Reuse DataTable component with HRMS-specific columns.

```javascript
const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedBusiness } = useTenant();
  
  const columns = [
    { header: 'Employee ID', accessor: 'employee_id' },
    { header: 'Name', accessor: (row) => `${row.first_name} ${row.last_name}` },
    { header: 'Email', accessor: 'email' },
    { header: 'Department', accessor: 'department_name' },
    { header: 'Position', accessor: 'job_title' },
    { header: 'Status', accessor: 'employment_status', 
      render: (value) => <StatusBadge status={value} /> },
    { header: 'Hire Date', accessor: 'hire_date', 
      render: (value) => new Date(value).toLocaleDateString() }
  ];
  
  return (
    <DataTable 
      data={employees}
      columns={columns}
      loading={loading}
      onRowClick={(employee) => navigate(`/hrms/employees/${employee.id}`)}
    />
  );
};
```

---

## 📊 Reporting & Analytics

### 1. Dashboard Metrics

**Key HRMS Metrics:**
```sql
-- Active Employee Count
SELECT COUNT(*) as active_employees
FROM hrms_employees
WHERE tenant_id = $1 
  AND employment_status = 'ACTIVE';

-- Headcount by Department
SELECT d.department_name, COUNT(e.id) as count
FROM hrms_employees e
JOIN departments d ON e.department_id = d.id
WHERE e.tenant_id = $1
GROUP BY d.department_name
ORDER BY count DESC;

-- Average Tenure
SELECT AVG(EXTRACT(YEAR FROM AGE(COALESCE(termination_date, NOW()), hire_date))) as avg_tenure_years
FROM hrms_employees
WHERE tenant_id = $1;

-- Turnover Rate (Last 12 months)
SELECT 
  COUNT(CASE WHEN termination_date >= NOW() - INTERVAL '12 months' THEN 1 END) as terminated,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(CASE WHEN termination_date >= NOW() - INTERVAL '12 months' THEN 1 END) / COUNT(*), 2) as turnover_rate
FROM hrms_employees
WHERE tenant_id = $1;
```

### 2. Export Functionality

**Key Takeaway:** Use Edge Functions for secure data exports.

```typescript
// Edge Function: exportEmployeeData
Deno.serve(async (req) => {
  const { format, filters } = await req.json(); // 'csv' or 'excel'
  
  // Verify permissions
  const user = await verifyAuth(req);
  if (!hasPermission(user, 'export_employee_data')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Fetch data
  const employees = await fetchFilteredEmployees(user.tenant_id, filters);
  
  // Generate file
  const fileContent = format === 'csv' 
    ? generateCSV(employees)
    : generateExcel(employees);
  
  // Log export
  await logAuditEvent(user.id, 'EXPORT', 'employees', employees.length);
  
  return new Response(fileContent, {
    headers: {
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel',
      'Content-Disposition': `attachment; filename=employees_${Date.now()}.${format}`
    }
  });
});
```

---

## 🔄 Data Migration & Sync

### 1. Contact to Employee Sync

**Workflow:**
```javascript
const convertContactToEmployee = async (contactId, additionalData) => {
  const { data: userToken } = await supabase.auth.getSession();
  
  // Call Edge Function for secure conversion
  const response = await callEdgeFunction(
    'convertContactToEmployee',
    {
      contact_id: contactId,
      employment_start_date: additionalData.startDate,
      department_id: additionalData.departmentId,
      salary: additionalData.salary, // Encrypted in Edge Function
      employment_type_id: additionalData.employmentTypeId
    },
    userToken.access_token
  );
  
  if (response.ok) {
    const { employee_id, contact_employee_link_id } = await response.json();
    return { employeeId: employee_id, linkId: contact_employee_link_id };
  } else {
    throw new Error('Conversion failed');
  }
};
```

**Edge Function Implementation:**
```typescript
// convertContactToEmployee.ts
export async function convertContactToEmployee(contactId: number, employmentData: any) {
  // 1. Fetch contact details
  const contact = await getContact(contactId);
  
  // 2. Create employee record
  const employee = await supabase
    .from('hrms_employees')
    .insert({
      tenant_id: contact.tenant_id,
      business_id: contact.business_id,
      source_contact_id: contactId,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      visa_status_id: contact.visa_status_id,
      job_title_id: contact.job_title_id,
      country_id: contact.country_id,
      state_id: contact.state_id,
      city_id: contact.city_id,
      hire_date: employmentData.employment_start_date,
      department_id: employmentData.department_id,
      employment_type_id: employmentData.employment_type_id,
      employment_status: 'ACTIVE',
      recruited_by_team_id: contact.assigned_team_id
    })
    .select()
    .single();
  
  // 3. Create link record
  await supabase
    .from('contact_employee_links')
    .insert({
      tenant_id: contact.tenant_id,
      contact_id: contactId,
      employee_id: employee.id,
      converted_by: getCurrentUserId()
    });
  
  // 4. Update contact status
  await supabase
    .from('contacts')
    .update({ workflow_status_id: getStatusId('Converted to Employee') })
    .eq('id', contactId);
  
  // 5. Transfer attachments
  await copyContactAttachmentsToEmployee(contactId, employee.id);
  
  // 6. Trigger onboarding workflow
  await initiateOnboarding(employee.id);
  
  return employee;
}
```

### 2. Bi-directional Updates

**Keep Contact & Employee Records in Sync:**
```sql
-- Trigger: Update contact when employee email changes
CREATE OR REPLACE FUNCTION sync_employee_to_contact()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts 
  SET 
    email = NEW.email,
    phone = NEW.phone,
    updated_at = NOW()
  WHERE id = NEW.source_contact_id
    AND NEW.source_contact_id IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_employee_to_contact
  AFTER UPDATE OF email, phone ON hrms_employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_to_contact();
```

---

## 🚀 Deployment & DevOps

### 1. Environment Configuration

**HRMS-Specific Environment Variables:**
```env
# Shared with CRM
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1

# HRMS-Specific
VITE_HRMS_MODULE_ENABLED=true
VITE_PAYROLL_PROVIDER_API_KEY=your-gusto-or-adp-key (if using external payroll)
VITE_BACKGROUND_CHECK_API_KEY=your-checkr-key (if using background checks)
VITE_BENEFITS_ADMIN_URL=your-benefits-portal-url

# Edge Function Secrets
ENCRYPTION_KEY=your-strong-encryption-key-for-pii
SSN_ENCRYPTION_SALT=random-salt-value
PAYROLL_API_SECRET=external-payroll-api-secret
```

### 2. Database Migration Strategy

**For New HRMS Tables:**
```bash
# Create new migration
supabase migration new add_hrms_employees_table

# Edit migration file
# supabase/migrations/202510XX_add_hrms_employees_table.sql

# Apply migration
supabase db push

# Deploy to production
supabase db push --db-url "postgresql://..."
```

**Migration Naming Convention:**
```
202510XX_add_hrms_[feature]_table.sql
202510XX_add_hrms_[feature]_rls_policies.sql
202510XX_seed_hrms_[data_type]_lookup_data.sql
```

### 3. CI/CD Integration

**GitHub Actions Workflow:**
```yaml
name: Deploy HRMS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Run tests
      - name: Run HRMS Tests
        run: |
          npm install
          npm run test:hrms
      
      # Deploy database migrations
      - name: Apply HRMS Migrations
        run: |
          npx supabase db push --db-url ${{ secrets.DATABASE_URL }}
      
      # Deploy Edge Functions
      - name: Deploy HRMS Edge Functions
        run: |
          npx supabase functions deploy convertContactToEmployee
          npx supabase functions deploy calculatePayroll
          npx supabase functions deploy generatePayslip
      
      # Deploy frontend
      - name: Deploy to Vercel
        run: |
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## 📱 Mobile Considerations

### 1. Employee Self-Service App

**Key Features:**
- View pay stubs
- Request time off
- Update personal information
- View benefits enrollment
- Access company directory

**Tech Stack Recommendation:**
- **React Native** (reuse React components where possible)
- **Supabase Client** (same auth & database)
- **Expo** (for easier deployment)

**Shared Code Pattern:**
```javascript
// Shared API functions (works on web & mobile)
export const getEmployeePaystubs = async (employeeId, userToken) => {
  const response = await callEdgeFunction(
    'getPaystubs',
    { employee_id: employeeId },
    userToken
  );
  return response.json();
};

// Web component
const PaystubList = () => {
  const { employee } = useHRMS();
  const [paystubs, setPaystubs] = useState([]);
  
  useEffect(() => {
    loadPaystubs();
  }, [employee]);
  
  const loadPaystubs = async () => {
    const data = await getEmployeePaystubs(employee.id, userToken);
    setPaystubs(data);
  };
  
  return <div>...</div>;
};

// Mobile component (React Native)
const PaystubList = () => {
  const { employee } = useHRMS();
  const [paystubs, setPaystubs] = useState([]);
  
  useEffect(() => {
    loadPaystubs();
  }, [employee]);
  
  const loadPaystubs = async () => {
    const data = await getEmployeePaystubs(employee.id, userToken);
    setPaystubs(data);
  };
  
  return <View>...</View>; // Same logic, different UI
};
```

---

## 🧪 Testing Strategy

### 1. Unit Tests

**Pattern from CRM:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmployeeForm from './EmployeeForm';

describe('EmployeeForm', () => {
  it('validates required fields', async () => {
    render(<EmployeeForm onSave={vi.fn()} />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });
  
  it('calls onSave with form data when valid', async () => {
    const mockSave = vi.fn();
    render(<EmployeeForm onSave={mockSave} />);
    
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      })
    );
  });
});
```

### 2. Integration Tests

**Test Database Operations:**
```javascript
describe('Employee CRUD Operations', () => {
  let testTenantId;
  let testEmployeeId;
  
  beforeEach(async () => {
    // Setup test tenant
    testTenantId = await createTestTenant();
  });
  
  it('creates employee with all required fields', async () => {
    const employeeData = {
      tenant_id: testTenantId,
      first_name: 'Test',
      last_name: 'Employee',
      email: 'test@example.com',
      hire_date: '2025-01-01',
      employment_status: 'ACTIVE'
    };
    
    const { data, error } = await supabase
      .from('hrms_employees')
      .insert(employeeData)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.id).toBeDefined();
    expect(data.first_name).toBe('Test');
    
    testEmployeeId = data.id;
  });
  
  it('enforces RLS - cannot view employees from other tenants', async () => {
    const otherTenantId = await createTestTenant();
    
    // Create employee in other tenant
    await createEmployee(otherTenantId, { first_name: 'Other' });
    
    // Try to fetch as current user (different tenant)
    const { data } = await supabase
      .from('hrms_employees')
      .select('*')
      .eq('tenant_id', otherTenantId);
    
    expect(data).toEqual([]); // RLS should block this
  });
});
```

### 3. E2E Tests (Playwright/Cypress)

```javascript
// cypress/e2e/employee-onboarding.cy.js
describe('Employee Onboarding Flow', () => {
  it('completes full onboarding workflow', () => {
    cy.login('hr@company.com', 'password');
    
    // Navigate to add employee
    cy.visit('/hrms/employees');
    cy.contains('Add Employee').click();
    
    // Fill form
    cy.get('[name="first_name"]').type('Jane');
    cy.get('[name="last_name"]').type('Smith');
    cy.get('[name="email"]').type('jane@company.com');
    cy.get('[name="hire_date"]').type('2025-11-01');
    cy.get('[name="department_id"]').select('Engineering');
    
    // Save
    cy.contains('Save Employee').click();
    
    // Verify success
    cy.contains('Employee created successfully').should('be.visible');
    cy.url().should('include', '/hrms/employees/');
    
    // Verify employee appears in list
    cy.visit('/hrms/employees');
    cy.contains('Jane Smith').should('be.visible');
  });
});
```

---

## 📈 Performance Optimization

### 1. Database Indexes

**Critical Indexes for HRMS:**
```sql
-- Employee lookups
CREATE INDEX idx_employees_tenant_id ON hrms_employees(tenant_id);
CREATE INDEX idx_employees_business_id ON hrms_employees(business_id);
CREATE INDEX idx_employees_status ON hrms_employees(employment_status);
CREATE INDEX idx_employees_email ON hrms_employees(LOWER(email));
CREATE INDEX idx_employees_hire_date ON hrms_employees(hire_date);

-- Composite index for filtered queries
CREATE INDEX idx_employees_tenant_status_business 
  ON hrms_employees(tenant_id, employment_status, business_id);

-- Payroll queries
CREATE INDEX idx_payroll_runs_date ON payroll_runs(pay_period_start, pay_period_end);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status) WHERE status = 'PENDING';

-- Time off requests
CREATE INDEX idx_time_off_employee_status 
  ON time_off_requests(employee_id, status) 
  WHERE status IN ('PENDING', 'APPROVED');
```

### 2. Query Optimization

**Use Proper Joins:**
```sql
-- GOOD: Single query with joins
SELECT 
  e.id, e.first_name, e.last_name, e.email,
  d.department_name,
  jt.job_title,
  et.employment_type,
  vs.visa_status
FROM hrms_employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN job_titles jt ON e.job_title_id = jt.id
LEFT JOIN employment_types et ON e.employment_type_id = et.id
LEFT JOIN visa_statuses vs ON e.visa_status_id = vs.id
WHERE e.tenant_id = $1
  AND e.employment_status = 'ACTIVE'
LIMIT 100;

-- BAD: Multiple separate queries
-- SELECT * FROM hrms_employees WHERE tenant_id = $1;
-- For each employee: SELECT * FROM departments WHERE id = ...
-- (N+1 query problem)
```

### 3. Caching Strategy

**Frontend Caching:**
```javascript
// Use React Query for server state caching
import { useQuery } from '@tanstack/react-query';

const useEmployees = (filters) => {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Invalidate cache on mutations
const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
    }
  });
};
```

**Backend Caching (Edge Functions):**
```typescript
// Cache lookup tables
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const cache = new Map();

async function getDepartments(tenantId: string) {
  const cacheKey = `departments_${tenantId}`;
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  
  const { data } = await supabase
    .from('departments')
    .select('*')
    .eq('tenant_id', tenantId);
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

## 🎓 Best Practices Summary

### ✅ DO

1. **CRITICAL: Include `tenant_id` in EVERY table** - This is mandatory for multi-tenancy, no exceptions
2. **CRITICAL: Include `business_id` in all transactional tables** - Enables multi-business support (IT/Healthcare divisions)
3. **Create indexes on tenant_id AND business_id** - Essential for query performance
4. **Enable RLS on all tables** - Security is non-negotiable
5. **Use proper foreign key constraints** - ON DELETE CASCADE for tenant_id, ON DELETE SET NULL for business_id
6. **Use Edge Functions for sensitive operations** (payroll, PII access, salary calculations)
7. **Encrypt PII data** (SSN, bank accounts, salary information)
8. **Log all data access** in audit_logs table with tenant_id and business_id
9. **Use lookup tables** for standardized values (all with tenant_id/business_id)
10. **Maintain audit trails** for status changes (employee_status_history, compensation_history)
11. **Implement proper error handling** in all components
12. **Test RLS policies** thoroughly before deployment
13. **Use transactions** for multi-table operations
14. **Add created_at, updated_at, created_by, updated_by** to all tables

### ❌ DON'T

1. **CRITICAL: Don't create tables without tenant_id** - This breaks multi-tenancy completely
2. **CRITICAL: Don't forget business_id in transactional tables** - Breaks business-level filtering
3. **Don't skip indexes on tenant_id/business_id** - Causes severe performance issues at scale
4. **Don't use ON DELETE RESTRICT for tenant_id** - Use CASCADE to ensure cleanup
5. **Don't store PII in plain text** - Always encrypt sensitive data
6. **Don't perform sensitive calculations in frontend** - Use Edge Functions
7. **Don't skip RLS policies** - Security is critical
8. **Don't hardcode role permissions** - Use role_menu_permissions table
9. **Don't forget cascading deletes** - Maintain referential integrity
10. **Don't expose service role key** in frontend code
11. **Don't skip input validation** - Validate on both client and server
12. **Don't create N+1 query problems** - Use proper joins with tenant_id/business_id
13. **Don't skip migration testing** - Test in staging first
14. **Don't ignore compliance requirements** - GDPR, CCPA, etc.

---

## 🔗 Integration Checklist

When building HRMS to link with CRM:

- [ ] **Database**
  - [ ] **CRITICAL: All HRMS tables include tenant_id (NOT NULL, CASCADE DELETE)**
  - [ ] **CRITICAL: All transactional tables include business_id (NULL allowed, SET NULL on delete)**
  - [ ] **CRITICAL: Create indexes on tenant_id and business_id for every table**
  - [ ] Reuse `tenants`, `profiles`, `businesses` tables
  - [ ] Share `visa_statuses`, `job_titles`, `countries`, `states`, `cities`
  - [ ] Create `contact_employee_links` table with tenant_id/business_id
  - [ ] Apply RLS policies to all new tables (tenant-scoped and business-scoped)
  - [ ] Add proper indexes for performance (tenant_id, business_id, frequently queried columns)
  - [ ] Add audit fields (created_at, updated_at, created_by, updated_by) to all tables
  - [ ] Test all foreign key cascading deletes

- [ ] **Authentication**
  - [ ] Use same Supabase Auth instance
  - [ ] Share `AuthProvider` context
  - [ ] Reuse JWT token for API calls

- [ ] **API Layer**
  - [ ] Extend `edgeFunctions.js` with HRMS functions
  - [ ] Create `convertContactToEmployee` Edge Function
  - [ ] Implement payroll calculation Edge Function
  - [ ] Add employee export Edge Function

- [ ] **UI Components**
  - [ ] Reuse shared components (DataTable, FilterBar, etc.)
  - [ ] Create HRMS-specific components
  - [ ] Implement employee self-service portal
  - [ ] Add onboarding workflow UI

- [ ] **Security**
  - [ ] Encrypt sensitive PII fields
  - [ ] Implement audit logging
  - [ ] Set up role-based permissions
  - [ ] Configure CORS for API access

- [ ] **Testing**
  - [ ] Write unit tests for components
  - [ ] Integration tests for database operations
  - [ ] E2E tests for critical workflows
  - [ ] Security testing (RLS, auth)

- [ ] **Deployment**
  - [ ] Set up CI/CD pipeline
  - [ ] Configure environment variables
  - [ ] Deploy Edge Functions
  - [ ] Run database migrations
  - [ ] Verify integrations work

---

## 📚 Additional Resources

### Documentation to Reference
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Context API Best Practices](https://react.dev/reference/react/createContext)
- [PostgreSQL Encryption with pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)
- [Vitest Testing Framework](https://vitest.dev/)

### Code References from CRM
- `src/api/edgeFunctions.js` - API call patterns
- `src/contexts/AuthProvider.jsx` - Authentication state
- `supabase/migrations/011_businesses_multi_business.sql` - Multi-business schema
- `src/components/CRM/Contacts/ContactForm.jsx` - Form validation patterns
- `src/components/Shared/AutocompleteSelect.jsx` - Reusable dropdown component

---

## 🔑 Quick Reference: tenant_id & business_id Pattern

### Every HRMS Table Must Follow This Pattern

```sql
CREATE TABLE table_name (
  id BIGSERIAL PRIMARY KEY,
  
  -- CRITICAL: Multi-tenancy columns (ALWAYS REQUIRED)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  
  -- Your table-specific columns
  column_name DATA_TYPE,
  
  -- Audit columns (ALWAYS REQUIRED)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- CRITICAL: Always create these indexes
CREATE INDEX idx_table_name_tenant ON table_name(tenant_id);
CREATE INDEX idx_table_name_business ON table_name(business_id);

-- CRITICAL: Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Tenant-scoped SELECT policy
CREATE POLICY "Users can view records from their tenant"
  ON table_name FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CRITICAL: Tenant-scoped INSERT policy
CREATE POLICY "Users can create records for their tenant"
  ON table_name FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Column Requirements Summary

| Column | Required | Data Type | Foreign Key | On Delete | Purpose |
|--------|----------|-----------|-------------|-----------|---------|
| `tenant_id` | ✅ YES (NOT NULL) | UUID | tenants(id) | CASCADE | Multi-tenancy isolation |
| `business_id` | ⚠️ Recommended | UUID | businesses(id) | SET NULL | Business-level filtering |
| `created_at` | ✅ YES | TIMESTAMPTZ | - | - | Audit trail |
| `updated_at` | ✅ YES | TIMESTAMPTZ | - | - | Audit trail |
| `created_by` | ✅ Recommended | UUID | profiles(id) | - | User tracking |
| `updated_by` | ✅ Recommended | UUID | profiles(id) | - | User tracking |

### Exceptions (Tables Without tenant_id/business_id)

Only system-wide configuration tables should omit these:
- ✅ `roles` - Global role definitions
- ✅ `hrms_menu_permissions` - System-wide menu configuration
- ❌ **All other tables MUST have tenant_id**

### Testing Checklist

Before deploying any new table:

```sql
-- 1. Verify tenant_id exists and is NOT NULL
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'your_table' AND column_name = 'tenant_id';
-- Expected: is_nullable = 'NO'

-- 2. Verify foreign key constraint with CASCADE
SELECT 
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'your_table' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND rc.delete_rule = 'CASCADE';
-- Expected: At least one result for tenant_id

-- 3. Verify indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'your_table' 
  AND (indexname LIKE '%tenant%' OR indexname LIKE '%business%');
-- Expected: At least 2 indexes (tenant_id, business_id)

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'your_table';
-- Expected: rowsecurity = true

-- 5. Verify RLS policies exist
SELECT COUNT(*) 
FROM pg_policies 
WHERE tablename = 'your_table';
-- Expected: At least 2 policies (SELECT, INSERT)
```

---

**Last Updated:** October 25, 2025
**Version:** 2.0
**Maintainer:** Development Team
