# Checklist Type Management - Data Administration Page

## Overview
Admin interface for creating and managing dynamic checklist types with entity mapping configuration. This single page handles both checklist type definitions and their entity mappings.

---

## Page Location
**Menu Path:** `HRMS Dashboard → Data Administration → Checklist Type Management`

**URL:** `/hrms/data-admin/checklist-types`

**Permissions:** HRMS Admin role only

---

## Page Layout

### Main Components

```
┌─────────────────────────────────────────────────────────────┐
│  Data Administration > Checklist Type Management            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ Create New Checklist Type]          [🔍 Search Types]   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ System Types                        [Filter: All ▼]  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  📘 Immigration Documents                    [✏️][👁️]  │  │
│  │     Maps to: hrms_employees.employee_id              │  │
│  │     Requires Employee Type: Yes                      │  │
│  │                                                        │  │
│  │  💼 Project Documents                        [✏️][👁️]  │  │
│  │     Maps to: hrms_projects.project_id                │  │
│  │     Requires Employee Type: No                       │  │
│  │                                                        │  │
│  │  🕐 Timesheet Documents                      [✏️][👁️]  │  │
│  │     Maps to: hrms_timesheets.timesheet_id            │  │
│  │     Requires Employee Type: No                       │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Custom Types                                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  📋 Client Onboarding                  [✏️][🗑️][👁️]  │  │
│  │     Maps to: contacts.id                             │  │
│  │     Requires Employee Type: No                       │  │
│  │                                                        │  │
│  │  📄 Vendor Contracts                   [✏️][🗑️][👁️]  │  │
│  │     Maps to: contacts.id (Vendor)                    │  │
│  │     Requires Employee Type: No                       │  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Create/Edit Checklist Type Modal

### Modal Structure

```
┌──────────────────────────────────────────────────────────┐
│  Create New Checklist Type                         [✕]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Basic Information                                        │
│  ─────────────────                                        │
│                                                           │
│  Type Code *                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ client_onboarding                                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ℹ️ Unique identifier (lowercase, underscores only)      │
│                                                           │
│  Type Name *                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Client Onboarding Documents                       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Description                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Documents required for onboarding new clients     │   │
│  │                                                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Entity Mapping Configuration                             │
│  ─────────────────────────                                │
│                                                           │
│  Target Entity Type *                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Custom                                          ▼ │   │
│  └──────────────────────────────────────────────────┘   │
│  Options: Employee, Project, Timesheet, Compliance,      │
│           Visa, Background Check, Performance, Custom    │
│                                                           │
│  Target Table Name *                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ contacts                                        ▼ │   │
│  └──────────────────────────────────────────────────┘   │
│  Available Tables: [Dropdown populated from database]    │
│                                                           │
│  Target ID Column *                                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ id                                              ▼ │   │
│  └──────────────────────────────────────────────────┘   │
│  Available Columns: [Dropdown based on selected table]   │
│                                                           │
│  Display Configuration                                    │
│  ─────────────────────                                    │
│                                                           │
│  Icon                          Color                      │
│  ┌───────────────────┐        ┌───────────────────┐     │
│  │ 📋 document     ▼ │        │ #3B82F6         🎨 │     │
│  └───────────────────┘        └───────────────────┘     │
│                                                           │
│  Display Order                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 10                                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Behavior Settings                                        │
│  ─────────────────                                        │
│                                                           │
│  ☑ Allow Multiple Templates                              │
│  ☑ Enable AI Parsing                                     │
│  ☑ Enable Compliance Tracking                            │
│  ☐ Require Employee Type                                 │
│                                                           │
│  ℹ️ If "Require Employee Type" is checked, templates    │
│     of this type must specify an employee type.          │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                          [Cancel]  [Save Checklist Type] │
└──────────────────────────────────────────────────────────┘
```

---

## Field Specifications

### 1. Type Code
- **Field Type:** Text input
- **Validation:**
  - Required
  - Must be unique
  - Lowercase only
  - Alphanumeric + underscores
  - No spaces
  - Max 100 characters
- **Pattern:** `^[a-z0-9_]+$`
- **Example:** `client_onboarding`, `vendor_contracts`, `employee_certification`

### 2. Type Name
- **Field Type:** Text input
- **Validation:**
  - Required
  - Max 255 characters
- **Example:** `Client Onboarding Documents`, `Vendor Contract Documents`

### 3. Description
- **Field Type:** Textarea
- **Validation:** Optional
- **Purpose:** Helps admins understand the purpose of this checklist type

### 4. Target Entity Type
- **Field Type:** Dropdown
- **Options:**
  - `employee` - Employee-related checklists
  - `project` - Project-related checklists
  - `timesheet` - Timesheet-related checklists
  - `compliance` - Compliance-related checklists
  - `visa` - Visa-specific checklists
  - `background_check` - Background check checklists
  - `performance` - Performance review checklists
  - `custom` - Custom entity types
- **Validation:** Required
- **Purpose:** Categorizes the checklist type for filtering and organization

### 5. Target Table Name
- **Field Type:** Searchable dropdown
- **Data Source:** Query database for available tables
- **Suggested Tables:**
  - `hrms_employees`
  - `hrms_projects`
  - `hrms_timesheets`
  - `hrms_compliance_items`
  - `hrms_visa_statuses`
  - `hrms_background_checks`
  - `hrms_performance_reports`
  - `contacts` (from CRM)
  - `businesses`
  - Custom tables
- **Validation:** Required
- **Smart Features:**
  - Auto-suggest based on target entity type
  - Show table description/row count
  - Validate table exists

### 6. Target ID Column
- **Field Type:** Searchable dropdown
- **Data Source:** Query columns from selected table
- **Behavior:**
  - Disabled until table is selected
  - Auto-populate columns when table selected
  - Filter to show only UUID/ID columns
  - Show column data type
- **Validation:** Required
- **Smart Features:**
  - Suggest primary key columns first
  - Show "employee_id", "project_id", etc. first
  - Indicate column data type (UUID, BIGINT, etc.)

### 7. Icon
- **Field Type:** Icon picker dropdown
- **Options:** Heroicons or similar icon library
- **Suggested Icons:**
  - 📘 passport (immigration)
  - 💼 briefcase (project)
  - 🕐 clock (timesheet)
  - 🛡️ shield-check (compliance)
  - 👤 user-plus (onboarding)
  - 👤 user-minus (offboarding)
  - 🔍 search (background check)
  - 📊 chart-bar (performance)
  - 📋 document (generic)
  - 📄 document-text (generic)
- **Validation:** Optional (defaults to 'document')

### 8. Color Code
- **Field Type:** Color picker
- **Format:** Hex color code (#RRGGBB)
- **Validation:** 
  - Optional (defaults to #3B82F6)
  - Must be valid hex color
- **Purpose:** UI color for this checklist type in lists and cards

### 9. Display Order
- **Field Type:** Number input
- **Validation:** 
  - Optional (defaults to 0)
  - Integer only
  - Min: 0, Max: 9999
- **Purpose:** Controls sort order in lists (lower numbers appear first)

### 10. Behavior Flags

#### Allow Multiple Templates
- **Field Type:** Checkbox
- **Default:** Checked
- **Purpose:** If checked, users can create multiple templates of this type
- **Example:** Multiple immigration checklists for different employee types

#### Enable AI Parsing
- **Field Type:** Checkbox
- **Default:** Checked
- **Purpose:** Enable AI document parsing for documents of this type
- **Impact:** Controls whether OpenRouter API is called for uploads

#### Enable Compliance Tracking
- **Field Type:** Checkbox
- **Default:** Checked
- **Purpose:** Track expiry dates and send compliance reminders
- **Impact:** Enables compliance dashboard entries for this type

#### Require Employee Type
- **Field Type:** Checkbox
- **Default:** Unchecked
- **Purpose:** If checked, templates of this type MUST specify an employee_type
- **Use Case:** Immigration checklists need different items for IT vs Healthcare
- **Validation:** If checked, template creation will enforce employee_type selection

---

## Table View Features

### List Display

Each checklist type card shows:
```
┌────────────────────────────────────────────────────────┐
│  📘 Immigration Documents                    [✏️][👁️]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Maps to: hrms_employees.employee_id                   │
│  Entity Type: Employee                                 │
│  Requires Employee Type: Yes                           │
│  Status: System Type (Cannot Delete)                   │
│  Templates: 4                                          │
│  Created: 2025-01-15 by Admin                          │
└────────────────────────────────────────────────────────┘
```

### Action Buttons

1. **Edit (✏️)**
   - Opens modal with pre-filled data
   - System types: Limited editing (cannot change mappings)
   - Custom types: Full editing

2. **Delete (🗑️)**
   - Only visible for custom types (is_system_type = false)
   - Confirmation dialog: "Delete checklist type? All templates and documents will be affected."
   - Cascade behavior: Warn if templates exist

3. **View Details (👁️)**
   - Shows full type configuration
   - Lists all templates using this type
   - Shows document count
   - Usage statistics

### Filters & Search

**Filter Options:**
- All Types
- System Types Only
- Custom Types Only
- By Entity Type (Employee, Project, Timesheet, etc.)
- Active Only / Inactive Only

**Search:**
- Search by type code, type name, or description
- Real-time filtering

---

## Smart Features & Validations

### 1. Table/Column Auto-Discovery
```javascript
// Backend Edge Function
async function getAvailableTables() {
  const { data, error } = await supabase.rpc('get_table_list', {
    schema_name: 'public'
  });
  
  return data.map(table => ({
    value: table.table_name,
    label: `${table.table_name} (${table.row_count} rows)`,
    description: table.description
  }));
}

async function getTableColumns(tableName) {
  const { data, error } = await supabase.rpc('get_column_list', {
    table_name: tableName
  });
  
  return data.map(col => ({
    value: col.column_name,
    label: `${col.column_name} (${col.data_type})`,
    isPrimaryKey: col.is_primary_key,
    dataType: col.data_type
  })).sort((a, b) => {
    // Sort primary key columns first
    if (a.isPrimaryKey && !b.isPrimaryKey) return -1;
    if (!a.isPrimaryKey && b.isPrimaryKey) return 1;
    return 0;
  });
}
```

### 2. Entity Type Suggestions
When user selects target entity type, suggest appropriate tables:
```javascript
const entityTableMapping = {
  'employee': ['hrms_employees', 'employees'],
  'project': ['hrms_projects', 'projects'],
  'timesheet': ['hrms_timesheets', 'timesheets'],
  'compliance': ['hrms_compliance_items', 'compliance_items'],
  'visa': ['hrms_visa_statuses', 'visa_statuses'],
  'background_check': ['hrms_background_checks'],
  'performance': ['hrms_performance_reports'],
  'custom': [] // Show all tables
};
```

### 3. Validation Rules

**On Save:**
```javascript
// Type code uniqueness
const existingType = await checkTypeCodeExists(typeCode);
if (existingType) {
  throw new Error('Type code already exists');
}

// Table/column existence
const tableExists = await validateTableExists(targetTableName);
if (!tableExists) {
  throw new Error('Target table does not exist');
}

const columnExists = await validateColumnExists(targetTableName, targetIdColumn);
if (!columnExists) {
  throw new Error('Target ID column does not exist in table');
}

// Employee type requirement consistency
if (requireEmployeeType) {
  // Check existing templates
  const templatesWithoutType = await getTemplatesWithoutEmployeeType(checklistTypeId);
  if (templatesWithoutType.length > 0) {
    throw new Error('Cannot require employee type: existing templates do not have employee_type specified');
  }
}
```

### 4. Impact Analysis
Before deleting a custom type, show impact:
```
┌──────────────────────────────────────────────────────────┐
│  Delete Checklist Type: Client Onboarding               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ⚠️  Warning: This will affect the following:            │
│                                                           │
│  • 3 Templates using this type                           │
│  • 47 Documents associated with these templates          │
│  • 12 Active checklists in progress                      │
│                                                           │
│  Are you sure you want to delete this checklist type?    │
│                                                           │
│  [Cancel]  [Delete (Cannot be undone)]                   │
└──────────────────────────────────────────────────────────┘
```

---

## Usage Example Flow

### Scenario: Admin wants to create "Vendor Certification" checklist

1. **Navigate:** Data Administration → Checklist Type Management

2. **Click:** "+ Create New Checklist Type"

3. **Fill Form:**
   - Type Code: `vendor_certification`
   - Type Name: `Vendor Certifications`
   - Description: `Certifications and licenses required from vendors`
   - Target Entity Type: `Custom`
   - Target Table Name: `contacts` (select from dropdown)
   - Target ID Column: `id` (auto-populated after table selection)
   - Icon: 🏅 badge-check
   - Color: #10B981 (green)
   - Display Order: 20
   - ☑ Allow Multiple Templates
   - ☑ Enable AI Parsing
   - ☑ Enable Compliance Tracking
   - ☐ Require Employee Type

4. **Save:** Click "Save Checklist Type"

5. **Result:** New checklist type created and available in:
   - Template creation dropdown
   - Document upload flows
   - Compliance tracking dashboard

6. **Next Step:** Navigate to "Checklist Templates" page to create actual templates with this type

---

## Database Queries

### Get All Checklist Types
```sql
SELECT 
  ct.*,
  COUNT(DISTINCT t.template_id) as template_count,
  COUNT(DISTINCT d.document_id) as document_count
FROM hrms_checklist_types ct
LEFT JOIN hrms_checklist_templates t ON ct.checklist_type_id = t.checklist_type_id
LEFT JOIN hrms_checklist_items ci ON t.template_id = ci.template_id
LEFT JOIN hrms_documents d ON ci.item_id = d.checklist_item_id
WHERE ct.tenant_id = :tenant_id
GROUP BY ct.checklist_type_id
ORDER BY ct.is_system_type DESC, ct.display_order ASC, ct.type_name ASC;
```

### Create Checklist Type
```sql
INSERT INTO hrms_checklist_types (
  tenant_id, type_code, type_name, type_description,
  target_entity_type, target_table_name, target_id_column,
  icon, color_code, display_order,
  allow_multiple_templates, require_employee_type,
  enable_ai_parsing, enable_compliance_tracking,
  is_active, is_system_type, created_by
) VALUES (
  :tenant_id, :type_code, :type_name, :type_description,
  :target_entity_type, :target_table_name, :target_id_column,
  :icon, :color_code, :display_order,
  :allow_multiple_templates, :require_employee_type,
  :enable_ai_parsing, :enable_compliance_tracking,
  true, false, :user_id
) RETURNING *;
```

### Get Available Tables
```sql
-- PostgreSQL system query
SELECT 
  table_name,
  obj_description(('"' || table_schema || '"."' || table_name || '"')::regclass) as description
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Get Table Columns
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE WHEN column_name = ANY(
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = :table_name::regclass AND i.indisprimary
  ) THEN true ELSE false END as is_primary_key
FROM information_schema.columns
WHERE table_name = :table_name
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

---

## RLS Policies

```sql
-- Read: Users can see checklist types in their tenant
CREATE POLICY "Users can view checklist types"
ON hrms_checklist_types FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM user_role_assignments WHERE user_id = auth.uid() LIMIT 1));

-- Create: Only admins can create checklist types
CREATE POLICY "Admins can create checklist types"
ON hrms_checklist_types FOR INSERT
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM user_role_assignments WHERE user_id = auth.uid() LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.role_id
    WHERE ura.user_id = auth.uid()
      AND r.role_level >= 4  -- Admin level or higher
  )
);

-- Update: Only admins can update checklist types (system types restricted)
CREATE POLICY "Admins can update checklist types"
ON hrms_checklist_types FOR UPDATE
USING (
  tenant_id = (SELECT tenant_id FROM user_role_assignments WHERE user_id = auth.uid() LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.role_id
    WHERE ura.user_id = auth.uid()
      AND r.role_level >= 4
  )
  AND (is_system_type = false OR auth.uid() IN (SELECT user_id FROM super_admins))  -- Only super admins can modify system types
);

-- Delete: Only admins can delete custom checklist types
CREATE POLICY "Admins can delete custom checklist types"
ON hrms_checklist_types FOR DELETE
USING (
  tenant_id = (SELECT tenant_id FROM user_role_assignments WHERE user_id = auth.uid() LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.role_id
    WHERE ura.user_id = auth.uid()
      AND r.role_level >= 4
  )
  AND is_system_type = false  -- Cannot delete system types
);
```

---

## Edge Function: Checklist Type Management

**Endpoint:** `checklist-type-management`

**Operations:**
- `list` - Get all checklist types with usage stats
- `get` - Get single checklist type details
- `create` - Create new checklist type
- `update` - Update existing checklist type
- `delete` - Delete custom checklist type
- `get_tables` - Get available database tables
- `get_columns` - Get columns for a table
- `validate` - Validate checklist type configuration

---

## Summary

This single page provides:

✅ **Dynamic Checklist Type Creation** - No hardcoded types  
✅ **Entity Mapping Configuration** - Admin defines table/column mappings  
✅ **Smart Auto-Discovery** - Query database for available tables/columns  
✅ **Validation & Safety** - Prevent invalid configurations  
✅ **Impact Analysis** - Show what will be affected before deletion  
✅ **System Type Protection** - Prevent accidental deletion of core types  
✅ **Unified Management** - Single page for all checklist type operations  

**Result:** Admins have full control over checklist architecture without touching code!

---

**Status:** ✅ UI Specification Complete  
**Next Step:** Implement React component for this page  
**Last Updated:** November 10, 2025
