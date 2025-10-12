# Email Domain Restriction Implementation

**Date**: October 12, 2025  
**Status**: ✅ **COMPLETE**

---

## Summary

Implemented **one tenant per email domain** policy to prevent multiple company registrations from the same organization. Users attempting to register with an already-claimed domain are directed to contact their company administrator.

---

## Problem Solved

### Before:
- ❌ Multiple users from the same company could create separate tenant accounts
- ❌ No enforcement of organizational boundaries
- ❌ Data fragmentation across multiple tenants
- ❌ Duplicate company accounts possible

### After:
- ✅ Only ONE tenant per email domain (e.g., @company.com)
- ✅ First user creates the tenant and becomes admin
- ✅ Additional users must be invited by admin
- ✅ Clear error messages guide users to contact admin
- ✅ Database-level enforcement with unique constraint

---

## Database Changes

### Tenants Table - UPDATED ✅

**Added Column:**
```sql
ALTER TABLE tenants 
ADD COLUMN email_domain TEXT;

-- Unique constraint ensures one tenant per domain
CREATE UNIQUE INDEX idx_tenants_email_domain_unique 
ON tenants(LOWER(email_domain));

-- Regular index for lookups
CREATE INDEX idx_tenants_email_domain 
ON tenants(email_domain);

-- Validation constraint
ALTER TABLE tenants 
ADD CONSTRAINT chk_email_domain_format 
CHECK (email_domain IS NULL OR (email_domain NOT LIKE '%@%' AND LENGTH(email_domain) > 2));
```

**Final Schema:**
```
tenants:
  - tenant_id (uuid, PK)
  - company_name (text, NOT NULL)
  - email_domain (text, UNIQUE - case insensitive) ← NEW
  - status (text)
  - created_at (timestamptz)
  - updated_at (timestamptz)
```

---

## Implementation Details

### 1. Domain Extraction

**From Email to Domain:**
```typescript
// Edge Function extracts domain from email
const emailDomain = email.toLowerCase().split('@')[1]
// user@company.com → company.com
```

### 2. Duplicate Domain Check

**Before Creating Tenant:**
```typescript
// Check if domain already registered
const { data: existingTenant } = await supabase
  .from('tenants')
  .select('tenant_id, company_name, email_domain')
  .ilike('email_domain', emailDomain)
  .single()

if (existingTenant) {
  throw new Error(
    `A company account with the domain @${emailDomain} already exists ` +
    `(${existingTenant.company_name}). Please contact your company ` +
    `administrator to be added to the existing account.`
  )
}
```

### 3. Tenant Creation with Domain

**Store Domain:**
```typescript
const { data: tenant, error: tenantError } = await supabase
  .from('tenants')
  .insert({
    company_name: companyName,
    email_domain: emailDomain,  // ← NEW
    status: 'ACTIVE'
  })
```

### 4. Database-Level Protection

**Unique Constraint Catches Race Conditions:**
```typescript
if (tenantError.code === '23505' && tenantError.message.includes('email_domain')) {
  throw new Error(
    `A company account with the domain @${emailDomain} already exists. ` +
    `Please contact your company administrator to be added to the existing account.`
  )
}
```

---

## Registration Flow

### Scenario 1: First User from Domain ✅

1. User enters: `john@acmecorp.com`
2. System checks: No tenant with domain `acmecorp.com`
3. ✅ **Tenant created** with `email_domain = 'acmecorp.com'`
4. ✅ **User becomes ADMIN**
5. Success! Company account created

### Scenario 2: Second User from Same Domain ❌

1. User enters: `jane@acmecorp.com`
2. System checks: Tenant with domain `acmecorp.com` **EXISTS**
3. ❌ **Registration blocked**
4. Error displayed:
   ```
   A company account with the domain @acmecorp.com already exists (Acme Corp).
   Please contact your company administrator to be added to the existing account.
   
   Need access? Contact your company administrator to invite you to the existing account.
   ```

### Scenario 3: Different Domain ✅

1. User enters: `bob@widgetsinc.com`
2. System checks: No tenant with domain `widgetsinc.com`
3. ✅ **New tenant created** with `email_domain = 'widgetsinc.com'`
4. ✅ **User becomes ADMIN**
5. Success! New company account created

---

## Error Handling

### User-Friendly Error Messages

**In Register.jsx:**
```jsx
{error && (
  <div className="alert alert-error">
    {error}
    {error.includes('domain') && error.includes('administrator') ? (
      <div style={{ marginTop: '10px', fontSize: '0.9em' }}>
        <strong>Need access?</strong> Contact your company administrator 
        to invite you to the existing account.
      </div>
    ) : null}
  </div>
)}
```

### Error Types Handled:

1. **Duplicate Email** (existing user)
   - Message: "This email address is already registered. Please try logging in instead."
   - Action: Link to login page

2. **Domain Already Exists** (NEW)
   - Message: "A company account with the domain @company.com already exists (Company Name). Please contact your company administrator..."
   - Action: Contact admin message

3. **Invalid Email Format**
   - Message: "Invalid email format"
   - Action: Fix email input

---

## Code Changes Summary

### Files Modified:

1. ✅ **Migration: `006_add_email_domain_to_tenants.sql`**
   - Added `email_domain` column
   - Created unique index (case-insensitive)
   - Added validation constraint

2. ✅ **Edge Function: `createTenantAndProfile/index.ts`**
   - Extract domain from email
   - Check for existing domain before creating tenant
   - Store domain with tenant
   - Handle unique constraint violation errors

3. ✅ **Frontend: `Register.jsx`**
   - Enhanced error handling for domain conflicts
   - Display helpful message to contact admin
   - Prevent multiple submission attempts

4. ✅ **Schema: `001_initial_schema.sql`**
   - Updated for future reference

---

## Security Benefits

### 1. Organizational Boundaries ✅
- Enforces company-level isolation
- Prevents unauthorized tenant creation
- Maintains data integrity

### 2. Database-Level Protection ✅
- Unique constraint prevents race conditions
- Case-insensitive matching (LOWER())
- Check constraint validates domain format

### 3. Clear User Guidance ✅
- Users know exactly what to do
- Reduces support requests
- Encourages proper account management

---

## Edge Cases Handled

### ✅ Case Sensitivity
```sql
CREATE UNIQUE INDEX idx_tenants_email_domain_unique 
ON tenants(LOWER(email_domain));
```
- `ACME.COM` = `acme.com` = `Acme.Com`

### ✅ Race Conditions
- Multiple simultaneous registrations with same domain
- Unique constraint catches duplicates
- First one wins, others get error

### ✅ Invalid Domains
```sql
CHECK (email_domain IS NULL OR 
       (email_domain NOT LIKE '%@%' AND LENGTH(email_domain) > 2))
```
- Prevents storing `@company.com` (must be `company.com`)
- Rejects domains shorter than 3 characters

### ✅ Free Email Providers (Future Enhancement)
**Recommendation:** Block common free email providers:
```typescript
const freeEmailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
if (freeEmailDomains.includes(emailDomain)) {
  throw new Error('Please use your company email address, not a personal email.')
}
```

---

## Testing Scenarios

### ✅ Database Level:
- [x] email_domain column exists
- [x] Unique index on LOWER(email_domain) exists
- [x] Check constraint validates format
- [x] Cannot insert duplicate domains (case-insensitive)

### ⚠️ Application Level (To Test):

**Test 1: First Registration**
- [ ] Register with `admin@testcompany.com`
- [ ] Verify tenant created with `email_domain = 'testcompany.com'`
- [ ] Verify user becomes ADMIN

**Test 2: Duplicate Domain (Same Case)**
- [ ] Try to register with `user@testcompany.com`
- [ ] Should see error about domain already existing
- [ ] Should see company name in error message
- [ ] Should see "contact administrator" message

**Test 3: Duplicate Domain (Different Case)**
- [ ] Try to register with `user@TESTCOMPANY.COM`
- [ ] Should see same error (case-insensitive)

**Test 4: Different Domain**
- [ ] Register with `admin@anothercompany.com`
- [ ] Should succeed and create new tenant
- [ ] Verify domain stored correctly

**Test 5: Invalid Domain Format**
- [ ] Edge function handles malformed emails
- [ ] Database rejects invalid domains

---

## Migration Impact

### Existing Data:
- ✅ `email_domain` added as nullable (existing tenants have NULL)
- ✅ No breaking changes to existing tenants
- ✅ Unique constraint only enforced on non-NULL values

### New Registrations:
- ✅ All new tenants will have `email_domain` populated
- ✅ Domain uniqueness enforced immediately

### Backfilling (If Needed):
```sql
-- Optional: Backfill existing tenants with domain from first profile
UPDATE tenants t
SET email_domain = (
  SELECT SPLIT_PART(p.email, '@', 2)
  FROM profiles p
  WHERE p.tenant_id = t.tenant_id
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE t.email_domain IS NULL;
```

---

## Future Enhancements

### 1. User Invitation System
- Admin can invite users by email
- Invited users receive link to join existing tenant
- No need to "register" - just accept invitation

### 2. Free Email Domain Blocking
- Prevent registrations from Gmail, Yahoo, Outlook, etc.
- Require business email addresses only

### 3. Domain Verification
- Send verification email to prove domain ownership
- Optional feature for high-security environments

### 4. Multi-Domain Support
- Allow single tenant to claim multiple domains
- Useful for companies with multiple domain names
- Example: `acme.com`, `acme.io`, `acmecorp.com`

### 5. Domain Transfer
- Allow admin to request domain transfer
- Useful if wrong tenant claimed the domain first
- Requires super admin approval

---

## Deployment Checklist

### Before Deployment:
- [x] Migration script created (`006_add_email_domain_to_tenants.sql`)
- [x] Edge Function updated with domain checking
- [x] Frontend updated with error handling
- [x] Schema documentation updated

### Deployment:
- [x] Migration applied to database
- [ ] Edge Function deployed to Supabase
- [ ] Frontend code deployed
- [ ] Test with real email addresses

### After Deployment:
- [ ] Monitor error logs for domain conflicts
- [ ] Test registration flow end-to-end
- [ ] Verify error messages display correctly
- [ ] Document process for users

---

## Documentation for Users

### For First User (Tenant Creator):
```
You are the first person from your company to register!
You will become the company administrator and can invite your teammates.
```

### For Additional Users:
```
❌ Cannot create new account

A company account with your email domain already exists.
Please contact your company administrator to be added to the account.

Your admin can:
1. Log in to the system
2. Go to User Management
3. Add you as a new user
```

---

## Rollback Plan (If Needed)

**NOT RECOMMENDED** - Feature enhances security.

If rollback is absolutely necessary:
1. Remove unique constraint: `DROP INDEX idx_tenants_email_domain_unique;`
2. Remove check constraint: `ALTER TABLE tenants DROP CONSTRAINT chk_email_domain_format;`
3. Remove column: `ALTER TABLE tenants DROP COLUMN email_domain;`
4. Revert Edge Function changes
5. Revert Register.jsx changes

**Better Approach:** Keep the feature, add refinements if needed.

---

## Conclusion

✅ **Implementation Complete!**

The system now enforces one tenant per email domain, ensuring:
- 🏢 Proper organizational boundaries
- 🔒 Enhanced security through database constraints
- 👥 Clear user guidance for account access
- 📊 Centralized company data
- ⚡ Race condition protection

**Status:** Ready for testing and deployment

---

**Implemented By:** GitHub Copilot  
**Implementation Date:** October 12, 2025  
**Migration:** `006_add_email_domain_to_tenants.sql`  
**Final Status:** ✅ **COMPLETE - READY FOR DEPLOYMENT**

🎉 **One Tenant Per Domain - Successfully Implemented!** 🎉
