# Tenant ID Migration Plan - CRITICAL BREAKING CHANGE

**Date**: October 12, 2025  
**Status**: ⚠️ **READY TO EXECUTE** (Low Risk - Minimal Data)  
**Impact**: BREAKING CHANGE - Requires Application Code Updates

---

## Current Situation Analysis

### Data Volume (Very Low - Perfect Time to Fix):
- **businesses**: 2 rows (tenant_id = 1)
- **contacts**: 0 rows
- **pipelines**: 0 rows
- **users**: 0 rows
- All other legacy tables: 0 rows

### Tenant Mapping Issue:
- **Legacy tables**: Use `tenant_id = 1` (bigint)
- **Tenants table**: Has 9 UUID tenants
- **Problem**: Cannot create FK constraint from bigint to uuid

---

## Migration Strategy

### Approach: TWO OPTIONS

#### **OPTION 1: Map Existing Bigint to UUID (Recommended)**
Map `tenant_id = 1` to one of the existing UUID tenants.

**Pros**:
- Preserves existing tenant data
- Maintains data relationships
- Simple one-to-one mapping

**Cons**:
- Requires identifying which UUID = tenant 1
- May have duplicate tenants if mapping is wrong

---

#### **OPTION 2: Clean Slate Migration (DESTRUCTIVE)**
Delete all legacy data and start fresh with UUID tenants.

**Pros**:
- Clean architecture from the start
- No mapping confusion
- Guaranteed consistency

**Cons**:
- ⚠️ **LOSES 2 business records**
- Requires re-entering test data
- More disruptive

---

## Recommended Action: OPTION 1 with Fallback

Since you have minimal data, I recommend:
1. Identify the primary tenant (likely the oldest or "Josh Pros LLC")
2. Map bigint tenant_id=1 to that tenant's UUID
3. Migrate all legacy tables to UUID
4. Add FK constraints
5. Update application code

---

## Migration Steps

### Phase 1: Pre-Migration Validation
```sql
-- 1. Backup current state
-- 2. Identify primary tenant UUID
-- 3. Verify no data loss
```

### Phase 2: Create Mapping Table
```sql
CREATE TABLE tenant_id_mapping (
    old_tenant_id bigint PRIMARY KEY,
    new_tenant_id uuid NOT NULL REFERENCES tenants(tenant_id),
    mapped_at timestamptz DEFAULT now()
);

-- Map tenant_id = 1 to primary UUID (adjust UUID as needed)
INSERT INTO tenant_id_mapping (old_tenant_id, new_tenant_id)
VALUES (1, '60273600-0ce0-4695-823d-9d4be8ae9406'); -- Josh Pros LLC (most recent)
```

### Phase 3: Migrate Each Table
For each of the 13 legacy tables, execute:
```sql
-- Example for businesses table:
ALTER TABLE businesses 
    ADD COLUMN new_tenant_id uuid;

UPDATE businesses b
SET new_tenant_id = m.new_tenant_id
FROM tenant_id_mapping m
WHERE b.tenant_id = m.old_tenant_id;

ALTER TABLE businesses 
    DROP COLUMN tenant_id;

ALTER TABLE businesses 
    RENAME COLUMN new_tenant_id TO tenant_id;

ALTER TABLE businesses 
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE businesses
    ADD CONSTRAINT businesses_tenant_id_fkey 
    FOREIGN KEY (tenant_id) 
    REFERENCES tenants(tenant_id) 
    ON DELETE CASCADE;
```

### Phase 4: Post-Migration Validation
```sql
-- Verify all records migrated
-- Verify FK constraints exist
-- Drop mapping table
```

---

## Risk Assessment

### Current Risk: **LOW** ✅
- Only 2 records affected
- Early stage (before production)
- Easy rollback if needed

### Post-Migration Risk: **LOW** ✅
- Application needs code updates
- Potential for API errors if not updated
- Testing required before deployment

---

## Decision Required

**Before executing, please confirm:**

1. **Which tenant should tenant_id=1 map to?**
   - Option A: `60273600-0ce0-4695-823d-9d4be8ae9406` (Josh Pros LLC - Oct 10)
   - Option B: `b5fd86bb-dd9a-404a-8aef-46dca64e2ca1` (Intuites LLC - Oct 5, oldest)
   - Option C: Create a new tenant and map to it
   - Option D: Delete the 2 business records and start clean

2. **Can we proceed with the migration?**
   - This will break any existing API calls using tenant_id=1
   - Application code must be updated to use UUIDs

---

**Recommendation**: 
Since data volume is minimal, proceed with migration NOW before accumulating more data. Map tenant_id=1 to "Josh Pros LLC" UUID.
