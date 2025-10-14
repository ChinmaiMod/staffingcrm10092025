# Testing Teams Feature - Troubleshooting Guide

## Issue: "Failed to load available staff"

This error occurs when:
1. The browser is using cached JavaScript (old version)
2. There are no internal staff members in the database
3. The tenant_id filtering is preventing access

## Solution Steps

### Step 1: Hard Refresh Browser
**Clear browser cache to load new code:**

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Click "Clear data"
- OR just press `Ctrl + F5` to hard refresh

**Firefox:**
- Press `Ctrl + Shift + Delete`
- Select "Cache"
- Click "Clear Now"
- OR press `Ctrl + F5`

### Step 2: Check Internal Staff Table

The Teams feature requires internal staff members to exist. Navigate to:
- **Data Administration → Internal Staff**

You should see at least one staff member listed there.

#### If No Staff Exists:

**Option A: Add via UI**
1. Go to Data Administration → Internal Staff
2. Click "Add Internal Staff"
3. Fill in:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@company.com
   - Position: Recruiter
   - Status: Active
4. Click "Save"

**Option B: Add via SQL (if you have Supabase access)**
```sql
-- Replace YOUR_TENANT_ID with your actual tenant_id
INSERT INTO internal_staff (
  tenant_id,
  first_name,
  last_name,
  email,
  position,
  status,
  is_active,
  hire_date,
  created_at,
  updated_at
) VALUES (
  'YOUR_TENANT_ID',
  'John',
  'Doe',
  'john.doe@company.com',
  'Recruiter',
  'ACTIVE',
  true,
  CURRENT_DATE,
  NOW(),
  NOW()
);
```

### Step 3: Verify RLS Policies

Make sure Row Level Security allows you to see internal staff:

1. Check your profile has the correct tenant_id
2. Verify you're logged in
3. Check browser console for any RLS errors

**Open Browser Console:**
- Press `F12`
- Go to "Console" tab
- Look for any red error messages
- Share screenshot if errors appear

### Step 4: Test the Fix

After hard refresh:

1. Navigate to **Teams** page: `/crm/data-admin/teams`
2. You should see:
   - ✅ Inline form at top (gray box)
   - ✅ Team Name field + Business dropdown + "+ Add Team" button
   - ✅ Description field below
3. Create a test team
4. Click "👥 Members" on the team
5. Click "+ Add Team Member"
6. **Staff dropdown should now show names** (not "Select Staff Member")
7. Select a staff member and role
8. Click "Add Member"

### Step 5: If Still Not Working

**Check these:**

1. **Is dev server running?**
   - You should see Vite running in terminal
   - URL: http://localhost:5173

2. **Did you pull latest code from Git?**
   ```bash
   git pull origin main
   ```

3. **Are there any console errors?**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

4. **Is the database accessible?**
   - Try viewing other pages (Contacts, Businesses)
   - If those work, it's specific to Teams/Staff

### Step 6: Debugging Queries

If staff still doesn't load, check the browser console for the actual query:

**Look for:**
```
Error loading staff: [error message here]
```

**Common errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to load available staff" | No tenant_id or no data | Add internal staff members |
| "permission denied" | RLS policy issue | Check you're logged in correctly |
| "relation does not exist" | Table not created | Run migration 025_internal_staff_schema.sql |
| "column does not exist" | Schema mismatch | Check migration applied correctly |

### Step 7: Verification Checklist

✅ **Before claiming it works, verify:**

1. [ ] Browser hard refreshed (Ctrl + F5)
2. [ ] Dev server restarted
3. [ ] At least 1 internal staff member exists
4. [ ] Can navigate to Teams page
5. [ ] Inline form visible (gray box)
6. [ ] Can create a team
7. [ ] Can click "Members" button
8. [ ] Can click "+ Add Team Member"
9. [ ] Staff dropdown shows actual names
10. [ ] Can successfully add a member

### Visual Confirmation

**What you should see in Add Team Member form:**

```
Add Team Member

Staff Member *  [John Doe - Recruiter     ▼]  ← Should show names, not "Select Staff Member"
Role *          [Recruiter                 ▼]

[Add Member]  [Cancel]
```

**What indicates it's NOT working:**

```
Failed to load available staff  ← Red error at top

Add Team Member

Staff Member *  [Select Staff Member       ▼]  ← Empty dropdown
Role *          [Recruiter                 ▼]

[Add Member]  [Cancel]
```

---

## Quick Fix Commands

**If you need to restart everything:**

```powershell
# Stop any running processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Pull latest changes
git pull origin main

# Start dev server
npm run dev

# Open browser to http://localhost:5173
# Press Ctrl + F5 to hard refresh
```

---

## Still Having Issues?

1. Take a screenshot of:
   - The Teams page (showing the form)
   - The Add Members modal (showing the error)
   - Browser console (F12 → Console tab)

2. Check terminal output for any errors

3. Verify migration 025_internal_staff_schema.sql was applied to Supabase

4. Check that you have at least one internal staff record in the database

---

*Last Updated: October 14, 2025*
*Dev Server: http://localhost:5173*
