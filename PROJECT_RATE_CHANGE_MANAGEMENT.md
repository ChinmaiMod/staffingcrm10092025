# Project Rate Change Management - Feature Guide

## Overview
Comprehensive solution for tracking rate changes within the same project over time with effective dates.

---

## Problem Statement

**Scenario:** Client reduces rate during ongoing project

**Original Issue:**
- Client: "Starting March 1st, we're reducing the rate from $85/hr to $78/hr"
- Old structure: Single rate fields in `hrms_projects` table
- Options were:
  1. ❌ Update existing rate (lose history)
  2. ❌ Create new project (wrong - it's the same project)
  3. ❌ No way to query "what was the rate on Feb 15th?"

**Solution:** New `hrms_project_rate_history` table with temporal tracking

---

## New Table: hrms_project_rate_history

### Purpose
Track ALL rate changes for a project with effective date ranges and maintain complete audit history.

### Key Features
✅ **Temporal Tracking** - Effective date ranges (from/to)  
✅ **No Overlaps** - Database constraint prevents overlapping periods  
✅ **Current Rate Flag** - Auto-maintained `is_current_rate` boolean  
✅ **Full Rate Details** - All rate fields (bill rate, candidate rate, discounts)  
✅ **Change Tracking** - Reason and notes for each change  
✅ **Complete History** - Never lose historical rates  

---

## Schema

```sql
CREATE TABLE hrms_project_rate_history (
  rate_history_id UUID PRIMARY KEY,
  project_id UUID REFERENCES hrms_projects(project_id),
  
  -- All Rate Fields
  actual_client_bill_rate DECIMAL(10,2) NOT NULL,
  informed_rate_to_candidate DECIMAL(10,2),
  candidate_percentage DECIMAL(5,2),
  rate_paid_to_candidate DECIMAL(10,2),
  lca_rate DECIMAL(10,2),
  vms_charges DECIMAL(10,2),
  
  -- Tenure & Volume Discounts (5 + 3 levels)
  tenure_discount_1...5, volume_discount_1...3,
  
  -- Temporal Range
  effective_from_date DATE NOT NULL,
  effective_to_date DATE,  -- NULL = currently active
  
  -- Metadata
  change_reason TEXT,  -- 'initial_rate', 'client_reduction', 'client_increase', etc.
  change_notes TEXT,
  is_current_rate BOOLEAN,
  
  CONSTRAINT no_overlapping_dates EXCLUDE USING gist (
    project_id WITH =,
    daterange(effective_from_date, COALESCE(effective_to_date, 'infinity'::date)) WITH &&
  )
);
```

---

## Usage Scenarios

### Scenario 1: Project Starts (Initial Rate)

**Date:** January 1, 2025  
**Action:** Create project with initial rate

```sql
-- Create project
INSERT INTO hrms_projects (
  project_id, project_name, employee_id,
  actual_client_bill_rate,  -- Current rate for quick access
  rate_paid_to_candidate,
  project_start_date
) VALUES (
  'proj-abc-123', 'Acme Corp - Software Engineer', 'emp-xyz',
  85.00,  -- Store current rate here too
  68.00,
  '2025-01-01'
);

-- Create initial rate history record
INSERT INTO hrms_project_rate_history (
  project_id,
  actual_client_bill_rate,
  rate_paid_to_candidate,
  candidate_percentage,
  effective_from_date,
  effective_to_date,  -- NULL = currently active
  change_reason,
  change_notes
) VALUES (
  'proj-abc-123',
  85.00,
  68.00,
  80.00,
  '2025-01-01',
  NULL,  -- Open-ended, currently active
  'initial_rate',
  'Initial project rate negotiated with client'
);

-- Result:
-- is_current_rate automatically set to TRUE by trigger
-- This is the active rate
```

---

### Scenario 2: Client Reduces Rate (Mid-Project Change)

**Date:** February 20, 2025  
**Effective Date:** March 1, 2025  
**Action:** Client notifies of rate reduction

```sql
-- Close out the old rate (update effective_to_date)
UPDATE hrms_project_rate_history
SET effective_to_date = '2025-02-28'  -- Last day of old rate
WHERE project_id = 'proj-abc-123'
  AND is_current_rate = true;

-- Insert new rate record
INSERT INTO hrms_project_rate_history (
  project_id,
  actual_client_bill_rate,
  rate_paid_to_candidate,
  candidate_percentage,
  effective_from_date,
  effective_to_date,  -- NULL = currently active
  change_reason,
  change_notes
) VALUES (
  'proj-abc-123',
  78.00,  -- Reduced from 85.00
  62.40,  -- Recalculated (80% of 78)
  80.00,
  '2025-03-01',
  NULL,
  'client_reduction',
  'Client budget cuts - market rate adjustment'
);

-- Also update current rate in main projects table
UPDATE hrms_projects
SET actual_client_bill_rate = 78.00,
    rate_paid_to_candidate = 62.40,
    updated_at = NOW()
WHERE project_id = 'proj-abc-123';

-- Result:
-- Old rate: effective_from='2025-01-01', effective_to='2025-02-28', is_current=false
-- New rate: effective_from='2025-03-01', effective_to=NULL, is_current=true
```

---

### Scenario 3: Client Increases Rate (Performance Bonus)

**Date:** June 15, 2025  
**Effective Date:** July 1, 2025  
**Action:** Client increases rate for good performance

```sql
-- Close current rate
UPDATE hrms_project_rate_history
SET effective_to_date = '2025-06-30'
WHERE project_id = 'proj-abc-123'
  AND is_current_rate = true;

-- Insert increased rate
INSERT INTO hrms_project_rate_history (
  project_id,
  actual_client_bill_rate,
  rate_paid_to_candidate,
  candidate_percentage,
  effective_from_date,
  change_reason,
  change_notes
) VALUES (
  'proj-abc-123',
  82.00,  -- Increased from 78.00
  65.60,  -- 80% of 82
  80.00,
  '2025-07-01',
  'client_increase',
  'Performance bonus - exceeded KPIs for Q2'
);

-- Update projects table
UPDATE hrms_projects
SET actual_client_bill_rate = 82.00,
    rate_paid_to_candidate = 65.60
WHERE project_id = 'proj-abc-123';
```

---

### Scenario 4: Multiple Rate Changes (Complex History)

**Timeline:**
- Jan 1: $85/hr (initial)
- Mar 1: $78/hr (client reduction)
- Jul 1: $82/hr (performance increase)
- Oct 1: $80/hr (market adjustment)

**Rate History Table:**
```
rate_history_id | effective_from | effective_to | rate  | is_current | change_reason
----------------|----------------|--------------|-------|------------|------------------
rate-001        | 2025-01-01     | 2025-02-28   | 85.00 | false      | initial_rate
rate-002        | 2025-03-01     | 2025-06-30   | 78.00 | false      | client_reduction
rate-003        | 2025-07-01     | 2025-09-30   | 82.00 | false      | client_increase
rate-004        | 2025-10-01     | NULL         | 80.00 | true       | market_adjustment
```

---

## Query Patterns

### 1. Get Current Rate for a Project

```sql
SELECT * 
FROM hrms_project_rate_history
WHERE project_id = 'proj-abc-123'
  AND is_current_rate = true;

-- OR (more explicit)
SELECT * 
FROM hrms_project_rate_history
WHERE project_id = 'proj-abc-123'
  AND effective_to_date IS NULL;
```

### 2. Get Rate Effective on Specific Date

```sql
-- What was the rate on February 15, 2025?
SELECT * 
FROM hrms_project_rate_history
WHERE project_id = 'proj-abc-123'
  AND effective_from_date <= '2025-02-15'
  AND (effective_to_date IS NULL OR effective_to_date >= '2025-02-15');

-- Result: $85/hr (initial rate period)
```

### 3. Get Full Rate History (Timeline View)

```sql
SELECT 
  effective_from_date,
  effective_to_date,
  actual_client_bill_rate,
  rate_paid_to_candidate,
  candidate_percentage,
  change_reason,
  change_notes,
  created_at,
  CASE 
    WHEN effective_to_date IS NULL THEN 'Current'
    ELSE 'Historical'
  END as status
FROM hrms_project_rate_history
WHERE project_id = 'proj-abc-123'
ORDER BY effective_from_date DESC;
```

### 4. Calculate Total Earnings by Rate Period

```sql
-- Get earnings breakdown by rate period for entire project
SELECT 
  rh.effective_from_date,
  rh.effective_to_date,
  rh.actual_client_bill_rate,
  rh.rate_paid_to_candidate,
  COUNT(te.entry_id) as days_worked,
  SUM(te.hours_worked) as total_hours,
  SUM(te.hours_worked * rh.rate_paid_to_candidate) as total_earnings
FROM hrms_project_rate_history rh
LEFT JOIN hrms_timesheets ts ON ts.project_id = rh.project_id
LEFT JOIN hrms_timesheet_entries te ON te.timesheet_id = ts.timesheet_id
WHERE rh.project_id = 'proj-abc-123'
  AND te.work_date BETWEEN rh.effective_from_date AND COALESCE(rh.effective_to_date, CURRENT_DATE)
GROUP BY rh.rate_history_id, rh.effective_from_date, rh.effective_to_date, 
         rh.actual_client_bill_rate, rh.rate_paid_to_candidate
ORDER BY rh.effective_from_date;

-- Result:
-- Period 1 (Jan-Feb): 320 hours @ $68/hr = $21,760
-- Period 2 (Mar-Jun): 640 hours @ $62.40/hr = $39,936
-- Period 3 (Jul-Sep): 480 hours @ $65.60/hr = $31,488
-- Total: 1,440 hours = $93,184
```

### 5. Find All Projects with Rate Reductions

```sql
SELECT 
  p.project_name,
  e.first_name || ' ' || e.last_name as employee_name,
  rh1.actual_client_bill_rate as old_rate,
  rh2.actual_client_bill_rate as new_rate,
  rh2.effective_from_date as reduction_date,
  rh2.change_notes
FROM hrms_project_rate_history rh2
JOIN hrms_project_rate_history rh1 ON rh1.project_id = rh2.project_id
  AND rh1.effective_to_date = rh2.effective_from_date - INTERVAL '1 day'
JOIN hrms_projects p ON p.project_id = rh2.project_id
JOIN hrms_employees e ON e.employee_id = p.employee_id
WHERE rh2.change_reason = 'client_reduction'
  AND rh2.actual_client_bill_rate < rh1.actual_client_bill_rate
ORDER BY rh2.effective_from_date DESC;
```

### 6. Upcoming Rate Changes (Future Effective Dates)

```sql
-- Show rate changes scheduled for the future
SELECT 
  p.project_name,
  e.first_name || ' ' || e.last_name as employee_name,
  rh.actual_client_bill_rate as new_rate,
  rh.effective_from_date,
  rh.change_reason,
  rh.change_notes
FROM hrms_project_rate_history rh
JOIN hrms_projects p ON p.project_id = rh.project_id
JOIN hrms_employees e ON e.employee_id = p.employee_id
WHERE rh.effective_from_date > CURRENT_DATE
  AND rh.effective_to_date IS NULL
ORDER BY rh.effective_from_date;
```

---

## UI Components

### Rate History Timeline View

```
Project: Acme Corp - Software Engineer
Employee: John Doe

Rate History:
┌─────────────────────────────────────────────────────────────┐
│ 🟢 Current Rate (Oct 1, 2025 - Present)                    │
│    Bill Rate: $80.00/hr                                    │
│    Candidate Rate: $64.00/hr (80%)                         │
│    Reason: Market Adjustment                               │
│    [View Details]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📈 Jul 1, 2025 - Sep 30, 2025 (92 days)                   │
│    Bill Rate: $82.00/hr                                    │
│    Candidate Rate: $65.60/hr (80%)                         │
│    Reason: Client Increase (Performance Bonus)             │
│    Hours Worked: 480 hrs | Earnings: $31,488              │
│    [View Details]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📉 Mar 1, 2025 - Jun 30, 2025 (122 days)                  │
│    Bill Rate: $78.00/hr                                    │
│    Candidate Rate: $62.40/hr (80%)                         │
│    Reason: Client Reduction (Budget Cuts)                  │
│    Hours Worked: 640 hrs | Earnings: $39,936              │
│    [View Details]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Jan 1, 2025 - Feb 28, 2025 (59 days)                      │
│    Bill Rate: $85.00/hr                                    │
│    Candidate Rate: $68.00/hr (80%)                         │
│    Reason: Initial Rate                                    │
│    Hours Worked: 320 hrs | Earnings: $21,760              │
│    [View Details]                                          │
└─────────────────────────────────────────────────────────────┘

Total Project Earnings: $93,184 (1,440 hours)
Average Rate: $64.71/hr
```

### Rate Change Form

```
┌──────────────────────────────────────────────────────────┐
│  Add Rate Change                                   [✕]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Current Rate: $78.00/hr (Since Mar 1, 2025)            │
│                                                           │
│  New Rate Information                                     │
│  ─────────────────────                                    │
│                                                           │
│  New Bill Rate *                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 75.00                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Candidate Percentage                                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 80                                             % │   │
│  └──────────────────────────────────────────────────┘   │
│  Candidate Rate: $60.00/hr (auto-calculated)            │
│                                                           │
│  Effective From Date *                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 2025-12-01                                     📅 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  Change Reason *                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Client Reduction                              ▼ │   │
│  └──────────────────────────────────────────────────┘   │
│  Options: Initial Rate, Client Reduction, Client         │
│           Increase, Market Adjustment, Discount Applied  │
│                                                           │
│  Notes                                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │ End client requested rate reduction due to       │   │
│  │ project scope change                              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ⚠️  Current rate will automatically close on           │
│      2025-11-30                                          │
│                                                           │
├──────────────────────────────────────────────────────────┤
│                          [Cancel]  [Save Rate Change]    │
└──────────────────────────────────────────────────────────┘
```

---

## Benefits

### 1. Complete Audit Trail
- Never lose rate history
- Track who changed rates and when
- Document reason for each change

### 2. Accurate Financial Reporting
- Calculate earnings by rate period
- Generate accurate invoices
- Audit revenue over time

### 3. Compliance & Legal
- Prove rate was X on date Y (for disputes)
- LCA compliance (rate cannot drop below LCA rate)
- Contract amendments tracking

### 4. Analytics & Insights
- Average project rates over time
- Identify rate trends (increases/decreases)
- Client rate change patterns

### 5. Timesheet Integration
- Automatically apply correct rate based on work date
- Calculate pay correctly even with mid-month rate changes
- Accurate payroll processing

---

## Edge Cases Handled

### 1. Rate Change Mid-Pay Period
**Scenario:** Rate changes on March 15, timesheet period is March 1-31

**Solution:**
```sql
-- Calculate split earnings
SELECT 
  SUM(CASE 
    WHEN te.work_date < '2025-03-15' THEN te.hours_worked * 85.00
    ELSE te.hours_worked * 78.00
  END) as total_earnings
FROM hrms_timesheet_entries te
WHERE te.work_date BETWEEN '2025-03-01' AND '2025-03-31';
```

### 2. Prevent Overlapping Periods
**Database Constraint:** `EXCLUDE USING gist` prevents overlaps

```sql
-- Attempt to insert overlapping period (FAILS)
INSERT INTO hrms_project_rate_history (
  project_id, effective_from_date, effective_to_date, ...
) VALUES (
  'proj-abc-123', '2025-02-15', '2025-04-15', ...
);
-- ERROR: conflicting key value violates exclusion constraint
```

### 3. LCA Rate Validation
**Business Rule:** Rate cannot drop below LCA rate for visa holders

```sql
-- Trigger to validate rate change
CREATE OR REPLACE FUNCTION fn_validate_lca_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Get project details
  SELECT is_lca_project, lca_rate INTO project
  FROM hrms_projects
  WHERE project_id = NEW.project_id;
  
  -- If LCA project, validate rate
  IF project.is_lca_project AND NEW.actual_client_bill_rate < project.lca_rate THEN
    RAISE EXCEPTION 'Rate cannot be lower than LCA rate ($%)', project.lca_rate;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_lca_rate
BEFORE INSERT OR UPDATE ON hrms_project_rate_history
FOR EACH ROW
EXECUTE FUNCTION fn_validate_lca_rate();
```

---

## Migration Strategy

### For Existing Projects

```sql
-- Migrate existing projects: Create initial rate history records
INSERT INTO hrms_project_rate_history (
  project_id,
  actual_client_bill_rate,
  informed_rate_to_candidate,
  candidate_percentage,
  rate_paid_to_candidate,
  lca_rate,
  vms_charges,
  tenure_discount_1, tenure_discount_1_period,
  -- ... all other discount fields ...
  effective_from_date,
  effective_to_date,
  change_reason,
  is_current_rate
)
SELECT 
  project_id,
  actual_client_bill_rate,
  informed_rate_to_candidate,
  candidate_percentage,
  rate_paid_to_candidate,
  lca_rate,
  vms_charges,
  tenure_discount_1, tenure_discount_1_period,
  -- ... all other discount fields ...
  project_start_date as effective_from_date,
  NULL as effective_to_date,  -- Currently active
  'initial_rate' as change_reason,
  true as is_current_rate
FROM hrms_projects
WHERE project_status = 'active';
```

---

## Summary

**✅ Complete Solution for Rate Management**

| Feature | Before | After |
|---------|--------|-------|
| Rate History | ❌ Lost on update | ✅ Full history preserved |
| Effective Dates | ❌ Not supported | ✅ Date range tracking |
| Change Reason | ❌ Unknown | ✅ Documented |
| Query Historical Rates | ❌ Impossible | ✅ Easy queries |
| Financial Accuracy | ❌ Approximate | ✅ Precise |
| Audit Trail | ❌ None | ✅ Complete |
| Overlap Prevention | ❌ No protection | ✅ Database constraint |

**Result:** Robust, audit-friendly, legally compliant rate management system!

---

**Status:** ✅ Architecture Complete  
**Implementation:** Ready for Phase 1 development  
**Last Updated:** November 10, 2025
