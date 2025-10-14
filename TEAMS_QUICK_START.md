# Quick Setup Guide - Teams Feature

## What Was Implemented

### 1. Cascading Location Dropdowns ✅
- Countries, States, and Cities now load from database
- State dropdown populates based on selected country
- City dropdown populates based on selected state
- Dropdowns are disabled until parent selection is made

### 2. Teams Management System ✅
- Complete CRUD interface for teams
- Add internal staff as team members with roles (LEAD or RECRUITER)
- Visual hierarchy showing Leads and Recruiters separately
- Business-specific or global teams
- Member count display

## Files Changed/Created

### New Files
1. `src/components/CRM/DataAdmin/Teams/TeamsPage.jsx` - Main teams management page
2. `src/components/CRM/DataAdmin/Teams/TeamMembersModal.jsx` - Team member assignment modal
3. `supabase/migrations/020_teams_and_team_members.sql` - Database schema
4. `TEAMS_FEATURE_IMPLEMENTATION.md` - Full documentation

### Modified Files
1. `src/components/CRM/Contacts/ContactForm.jsx` - Added cascading dropdowns
2. `src/components/CRM/common/AutocompleteSelect.jsx` - Added disabled prop
3. `src/components/CRM/DataAdmin/DataAdministration.jsx` - Added Teams routing

## Database Changes ✅ APPLIED

**Migration 020 has been successfully applied to production:**
- Created `teams` table
- Created `team_members` table
- Added 7 indexes for performance
- Enabled RLS with 10 policies
- All constraints and relationships in place

## How to Test

### Test Cascading Dropdowns
1. Navigate to **CRM → Contacts → Add Contact**
2. Scroll to the Location section
3. Select a country (e.g., USA)
4. Notice the State dropdown becomes enabled and populates
5. Select a state
6. Notice the City dropdown becomes enabled and populates
7. Try changing the country - state and city should reset

### Test Teams Feature
1. Navigate to **CRM → Data Admin**
2. Click on the **Teams** card (🤝 icon)
3. Click **+ Add Team**
4. Fill in:
   - Team Name: "Sales Team Alpha"
   - Business: Select one or leave as "All Businesses"
   - Description: "Primary sales team"
   - Keep Active checked
5. Click **Create Team**
6. You should see the team in the list
7. Click on **"0 members"** to open the member management modal
8. Click **+ Add Team Member**
9. Select a staff member from the dropdown
10. Choose a role (Lead or Recruiter)
11. Click **Add Member**
12. Notice the member appears in the appropriate section (Leads or Recruiters)
13. Try changing the member's role using the dropdown
14. Try removing a member
15. Close the modal and verify the member count updated

## Features Available

### Teams Management
- ✅ Create teams with optional business assignment
- ✅ Edit team details (name, description, business, active status)
- ✅ Delete teams (with confirmation)
- ✅ View team list with member counts
- ✅ Filter by current business context

### Team Members
- ✅ Add internal staff to teams
- ✅ Assign role: LEAD or RECRUITER
- ✅ Change member roles
- ✅ Remove members from teams
- ✅ Visual hierarchy (Leads shown first, color-coded)
- ✅ Prevent duplicate assignments
- ✅ Show member details (name, position, email, assignment date)

### Location Dropdowns
- ✅ Dynamic country loading from database
- ✅ State loading based on selected country
- ✅ City loading based on selected state
- ✅ Disabled states until parent selected
- ✅ Automatic reset when parent changes
- ✅ Works with existing contact data

## Database Schema

### Teams Table
```
team_id          UUID (PK)
tenant_id        UUID (FK) - Multi-tenant isolation
business_id      UUID (FK) - Optional business scoping
team_name        TEXT - Unique per tenant/business (case-insensitive)
description      TEXT
is_active        BOOLEAN
created_by       UUID
updated_by       UUID
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### Team Members Table
```
member_id        UUID (PK)
team_id          UUID (FK) - Links to teams
staff_id         UUID (FK) - Links to internal_staff
role             TEXT - 'LEAD' or 'RECRUITER' (enforced)
assigned_at      TIMESTAMP
assigned_by      UUID
is_active        BOOLEAN

UNIQUE(team_id, staff_id) - Prevents duplicates
```

## Security

- ✅ Full Row Level Security (RLS) enabled
- ✅ Tenant isolation - users only see their tenant's teams
- ✅ Cascade deletion - removing a team removes all members
- ✅ Foreign key constraints maintain data integrity
- ✅ CHECK constraint enforces valid roles

## Next Steps

1. **Test both features thoroughly**
2. **Create sample data** - Add a few teams and assign members
3. **Verify filtering** - Test business-specific vs global teams
4. **Test edge cases** - Try duplicate names, duplicate members
5. **Performance check** - Verify queries are fast with RLS

## Troubleshooting

### If Teams page doesn't load:
- Check browser console for errors
- Verify migration was applied successfully
- Ensure you're logged in with valid tenant

### If dropdowns don't populate:
- Check that countries/states/cities tables have data
- Verify RLS policies allow reading these tables
- Check browser network tab for failed requests

### If you can't add team members:
- Ensure internal_staff table has active records
- Verify the staff member isn't already on the team
- Check for tenant_id mismatch

## Migration Status

✅ **Migration 020** successfully applied to database:
- Project: `yvcsxadahzrxuptcgtkg`
- Tables: `teams`, `team_members`
- Indexes: 7 total
- RLS Policies: 10 total (5 per table)
- Status: **LIVE IN PRODUCTION**

## Support

For issues or questions, refer to:
- `TEAMS_FEATURE_IMPLEMENTATION.md` - Full technical documentation
- Migration file: `supabase/migrations/020_teams_and_team_members.sql`
- Component files in `src/components/CRM/DataAdmin/Teams/`

---

**All features are ready for use!** 🎉
