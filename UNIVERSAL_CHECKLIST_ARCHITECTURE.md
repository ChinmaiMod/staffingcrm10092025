# Universal Checklist Architecture - Design Document

## Overview
This document explains the architectural redesign from specialized document tables to a universal checklist system that can handle ALL document types across the HRMS.

---

## Problem Statement (Before)

### Original Design Issues:
1. **Table Proliferation:** Separate tables for each document context
   - `hrms_employee_documents` for employee docs
   - `hrms_project_msa_po` for MSA/PO
   - `hrms_project_coi` for COI
   - Potential for `hrms_timesheet_documents`, `hrms_compliance_documents`, etc.

2. **Code Duplication:** Similar upload/versioning/compliance logic repeated
3. **Rigid Schema:** Adding new document types required new tables
4. **Inconsistent Experience:** Different UIs for different document types
5. **Complex Maintenance:** Changes needed in multiple places

**Table Count:** 29 tables

---

## Solution (After)

### Universal Checklist System

#### Core Concept:
**Single, reusable architecture for ALL document workflows in the system.**

#### Key Tables:

##### 1. `hrms_checklist_templates` (ENHANCED)
```sql
checklist_type VARCHAR(100) NOT NULL
  -- 'immigration', 'project', 'timesheet', 'compliance'
  -- 'employee_onboarding', 'employee_offboarding'
  -- 'background_check', 'performance_review'
  -- 'msa_po', 'coi', 'custom'

employee_type VARCHAR(50)  -- Optional: for immigration checklists
context_entity VARCHAR(100) -- 'employee', 'project', 'timesheet', NULL
```

**Examples:**
- Immigration checklist for IT USA employees: `checklist_type='immigration', employee_type='it_usa'`
- Project checklist for MSA/PO/COI: `checklist_type='project', context_entity='project'`
- Timesheet checklist: `checklist_type='timesheet', context_entity='timesheet'`

##### 2. `hrms_documents` (RENAMED & ENHANCED)
```sql
-- Polymorphic pattern
entity_type VARCHAR(50) NOT NULL  -- 'employee', 'project', 'timesheet', 'compliance'
entity_id UUID NOT NULL           -- References the specific entity

document_type VARCHAR(100)        -- 'h1b', 'msa', 'po', 'coi', 'timesheet', etc.
metadata JSONB                    -- Flexible storage for document-specific fields
```

**Usage Examples:**
```sql
-- Employee H1B document
INSERT INTO hrms_documents (entity_type, entity_id, document_type, ...)
VALUES ('employee', '123-uuid', 'h1b', ...);

-- Project MSA
INSERT INTO hrms_documents (entity_type, entity_id, document_type, metadata, ...)
VALUES ('project', '456-uuid', 'msa', '{"document_number": "MSA-2025-001"}', ...);

-- Project COI
INSERT INTO hrms_documents (entity_type, entity_id, document_type, metadata, ...)
VALUES ('project', '456-uuid', 'coi', '{"policy_number": "POL-123456"}', ...);

-- Timesheet attachment
INSERT INTO hrms_documents (entity_type, entity_id, document_type, ...)
VALUES ('timesheet', '789-uuid', 'timesheet', ...);
```

#### Removed Tables:
- ❌ `hrms_project_msa_po` - Now via `hrms_documents` with `entity_type='project'`
- ❌ `hrms_project_coi` - Now via `hrms_documents` with `entity_type='project'`

**Table Count:** 26 tables (reduced from 29)

---

## Benefits

### 1. Single Implementation
- One upload component works for ALL document types
- One AI parsing service handles ALL documents
- One compliance tracking system for ALL expiry dates
- One version control mechanism for ALL renewals

### 2. Scalability
Adding new document types is trivial:
```sql
-- Need to track employee certifications? Just add a checklist:
INSERT INTO hrms_checklist_templates (checklist_type, employee_type, ...)
VALUES ('certification', 'healthcare_usa', ...);

-- No schema changes required!
```

### 3. Consistency
- Same UI/UX for all document uploads
- Same compliance reminders for all document types
- Same AI parsing interface
- Same version control workflow

### 4. Maintainability
- Fix a bug once, fixed everywhere
- Add a feature once, available everywhere
- Test once, validated everywhere

### 5. Flexibility
JSONB `metadata` field allows document-specific data without schema changes:
```json
// MSA metadata
{
  "document_number": "MSA-2025-001",
  "vendor_level": 1,
  "rate_type": "hourly"
}

// COI metadata
{
  "policy_number": "POL-123456",
  "insurance_company": "Acme Insurance",
  "coverage_amount": "1000000"
}

// H1B metadata
{
  "receipt_number": "WAC-123-456-789",
  "petition_number": "PET-001",
  "lca_case_number": "LCA-2025-001"
}
```

---

## Checklist Type Matrix

| Checklist Type | Context Entity | Use Cases | Examples |
|---------------|----------------|-----------|----------|
| `immigration` | `employee` | Employee visa/immigration docs | H1B, I9, W4, Passport |
| `project` | `project` | Project-related documents | MSA, PO, COI, SOW |
| `timesheet` | `timesheet` | Timesheet supporting docs | Receipts, Expense Reports |
| `compliance` | `employee` | Regulatory compliance | Background checks, Drug tests |
| `employee_onboarding` | `employee` | New hire documents | Offer letter, I9, Tax forms |
| `employee_offboarding` | `employee` | Exit documents | Resignation, Exit interview |
| `background_check` | `employee` | Background verification | Criminal check, Education verification |
| `performance_review` | `employee` | Performance docs | Review forms, Goals, PIPs |
| `msa_po` | `project` | Legal agreements | MSA, Purchase Orders |
| `coi` | `project` | Insurance | Certificate of Insurance |
| `custom` | `any` | Organization-specific | Custom workflows |

---

## Query Patterns

### Get All Employee Immigration Documents
```sql
SELECT d.*
FROM hrms_documents d
JOIN hrms_checklist_items ci ON d.checklist_item_id = ci.item_id
JOIN hrms_checklist_templates ct ON ci.template_id = ct.template_id
WHERE d.entity_type = 'employee'
  AND d.entity_id = :employee_id
  AND ct.checklist_type = 'immigration'
  AND d.is_current_version = true;
```

### Get All Project MSAs
```sql
SELECT d.*
FROM hrms_documents d
WHERE d.entity_type = 'project'
  AND d.entity_id = :project_id
  AND d.document_type = 'msa'
  AND d.is_current_version = true;
```

### Get All COIs Expiring in 30 Days
```sql
SELECT d.*, p.project_name, e.first_name, e.last_name
FROM hrms_documents d
JOIN hrms_projects p ON d.entity_id = p.project_id
JOIN hrms_employees e ON p.employee_id = e.employee_id
WHERE d.entity_type = 'project'
  AND d.document_type = 'coi'
  AND d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND d.is_current_version = true;
```

### Get All Expiring Documents (Universal)
```sql
SELECT 
  d.*,
  ct.checklist_type,
  CASE 
    WHEN d.entity_type = 'employee' THEN e.first_name || ' ' || e.last_name
    WHEN d.entity_type = 'project' THEN p.project_name
    WHEN d.entity_type = 'timesheet' THEN 'Timesheet #' || t.timesheet_id
  END as entity_name
FROM hrms_documents d
JOIN hrms_checklist_items ci ON d.checklist_item_id = ci.item_id
JOIN hrms_checklist_templates ct ON ci.template_id = ct.template_id
LEFT JOIN hrms_employees e ON d.entity_type = 'employee' AND d.entity_id = e.employee_id
LEFT JOIN hrms_projects p ON d.entity_type = 'project' AND d.entity_id = p.project_id
LEFT JOIN hrms_timesheets t ON d.entity_type = 'timesheet' AND d.entity_id = t.timesheet_id
WHERE d.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND d.is_current_version = true
  AND d.compliance_tracking_flag = true;
```

---

## UI/UX Standardization

### Component Reusability

#### DocumentUploadManager Component (Universal)
```jsx
<DocumentUploadManager
  entityType="employee"        // or 'project', 'timesheet', 'compliance'
  entityId={employeeId}        // or projectId, timesheetId
  checklistType="immigration"  // or 'project', 'timesheet', etc.
  onUploadComplete={handleUpload}
/>

// Same component works for:
// - Employee documents
// - Project documents (MSA/PO/COI)
// - Timesheet documents
// - Compliance documents
```

#### DocumentChecklistViewer Component (Universal)
```jsx
<DocumentChecklistViewer
  entityType="project"
  entityId={projectId}
  checklistType="msa_po"
  showComplianceAlerts={true}
/>

// Displays checklist with:
// - Required/optional items
// - Upload status
// - Expiry dates
// - Compliance alerts
// - Version history
```

---

## Migration Path

### Phase 1: New Installations (Immediate)
- Use universal checklist system from day 1
- No migration needed

### Phase 2: Existing Data (If Needed)
```sql
-- Migrate MSA/PO documents to universal system
INSERT INTO hrms_documents (
  tenant_id, business_id, entity_type, entity_id,
  document_name, document_type, file_path, file_name,
  start_date, expiry_date, metadata, ...
)
SELECT 
  tenant_id, business_id, 'project', project_id,
  document_number, document_type, file_path, file_name,
  start_date, end_date,
  jsonb_build_object('document_number', document_number),
  ...
FROM hrms_project_msa_po;

-- Migrate COI documents
INSERT INTO hrms_documents (
  tenant_id, business_id, entity_type, entity_id,
  document_name, document_type, file_path, file_name,
  start_date, expiry_date, metadata, ...
)
SELECT 
  tenant_id, business_id, 'project', project_id,
  coi_number, 'coi', file_path, file_name,
  issue_date, expiry_date,
  jsonb_build_object('coi_number', coi_number, 'policy_number', coi_number),
  ...
FROM hrms_project_coi;
```

---

## Testing Strategy

### Unit Tests
- Document upload for each entity type
- AI parsing for each document type
- Compliance tracking for each context
- Version control for all document types

### Integration Tests
- End-to-end checklist workflows
- Cross-entity compliance reporting
- Document search across all types
- Expiry reminders for all contexts

### Performance Tests
- Query performance with polymorphic pattern
- Index optimization for entity_type + entity_id
- Bulk document operations

---

## Future Extensibility

### Easy Additions (No Schema Changes):

1. **Client Document Checklist**
   ```sql
   checklist_type='client_documents'
   entity_type='client'  -- New entity type
   ```

2. **Vendor Document Checklist**
   ```sql
   checklist_type='vendor_documents'
   entity_type='vendor'
   ```

3. **Business Document Checklist**
   ```sql
   checklist_type='business_compliance'
   entity_type='business'
   ```

4. **Interview Document Checklist**
   ```sql
   checklist_type='interview'
   entity_type='candidate'
   ```

All follow the same pattern, reuse the same components, and require ZERO schema changes!

---

## Summary

### Before → After
- **29 tables** → **26 tables** (-3 tables, -10% complexity)
- **3 document systems** → **1 universal system**
- **Rigid schema** → **Flexible, extensible architecture**
- **Inconsistent UX** → **Unified experience**
- **Complex maintenance** → **Simple, DRY codebase**

### Key Takeaway
**"Build once, use everywhere"** - The universal checklist system provides a scalable, maintainable foundation for ALL document workflows in the HRMS.

---

**Status:** ✅ Architecture Approved  
**Implementation:** Ready for Phase 1 development  
**Last Updated:** November 10, 2025
