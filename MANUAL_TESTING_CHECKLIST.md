# Manual Testing Guide - Teams & Cascading Dropdowns

## 🚀 Quick Start

**Server Status:** ✅ Running at http://localhost:5173/  
**Compilation:** ✅ No errors  
**Date:** October 14, 2025

---

## Feature 1: Cascading Location Dropdowns

### Access Path
CRM → Contacts → + Add Contact → Scroll to Location section

### Test Checklist

#### Initial State
- [ ] Country dropdown is enabled
- [ ] State dropdown is disabled (gray background)
- [ ] City dropdown is disabled (gray background)
- [ ] Disabled dropdowns show placeholder text

#### Test: USA → California → Los Angeles
1. [ ] Select Country: **USA**
   - State dropdown becomes enabled
   - Shows USA states
2. [ ] Type "Cal" in State dropdown
   - Filters to show California, etc.
3. [ ] Select State: **California**
   - City dropdown becomes enabled
   - Shows California cities
4. [ ] Type "Los" in City dropdown
   - Filters to show Los Angeles
5. [ ] Select City: **Los Angeles**
   - Value displays correctly

#### Test: Country Change Reset
1. [ ] Change Country from USA to **India**
   - State value clears (California removed)
   - City value clears (Los Angeles removed)
   - State dropdown populates with Indian states
   - City dropdown becomes disabled again

#### Test: India → Maharashtra → Mumbai
1. [ ] Select State: **Maharashtra**
   - City dropdown enables
   - Shows Indian cities
2. [ ] Select City: **Mumbai**
   - Value displays correctly

#### Test: Save & Edit
1. [ ] Fill required fields and save contact
2. [ ] Edit the same contact
   - Country pre-populates correctly
   - State pre-populates correctly
   - City pre-populates correctly
3. [ ] All dropdowns still work when editing

---

## Feature 2: Teams Management

### Access Path
CRM → Data Admin → Teams (🤝 card)

### Test Checklist

#### Create Team
1. [ ] Click **+ Add Team**
2. [ ] Fill form:
   - Team Name: "Sales Team Alpha"
   - Business: Select one
   - Description: "Primary sales team"
3. [ ] Click **Create Team**
   - Success message appears
   - Team shows in list with "0 members"

#### Add Team Members
1. [ ] Click **"0 members"** link
   - Modal opens
2. [ ] Click **+ Add Team Member**
3. [ ] Add Lead:
   - Select staff member
   - Role: **Lead**
   - Click Add
   - Appears in blue "Team Leads" section
4. [ ] Add Recruiter:
   - Click + Add Team Member
   - Select different staff
   - Role: **Recruiter**
   - Appears in "Recruiters" section with green badge

#### Change Member Role
1. [ ] Find recruiter in list
2. [ ] Change role dropdown from Recruiter to **Lead**
   - Success message
   - Member moves to Leads section
   - Badge changes to blue

#### Remove Member
1. [ ] Click **Remove** on any member
2. [ ] Confirm dialog
   - Member disappears
   - Count updates

#### Test Duplicate Prevention
1. [ ] Try adding same staff member twice
   - Error: "already assigned to this team"
   - Member NOT added

#### Edit Team
1. [ ] Click **Edit** on team
2. [ ] Change description
3. [ ] Uncheck Active
4. [ ] Click Update
   - Changes save
   - Status badge shows "Inactive"

#### Delete Team
1. [ ] Click **Delete** on a team
2. [ ] Confirm
   - Team removed
   - Members cascade deleted

---

## Quick Bug Check

### Watch for:
- [ ] Console errors (F12 → Console tab)
- [ ] Network failures (F12 → Network tab)
- [ ] Slow loading (>2 seconds)
- [ ] UI glitches
- [ ] Data not saving
- [ ] RLS errors (403 Forbidden)

---

## Browser Testing

Open http://localhost:5173/ and verify:
- [ ] App loads successfully
- [ ] Can login
- [ ] No console errors on page load
- [ ] Both features accessible

---

## Test Data Requirements

### For Cascading Dropdowns:
✅ Database has:
- 2 countries (USA, India)
- 60 states
- 156 cities

### For Teams:
Need at least 3-5 Internal Staff records:
- Navigate to: Data Admin → Internal Staff
- Create staff if needed

---

## Expected Results Summary

### Cascading Dropdowns
✅ Dropdowns cascade correctly  
✅ Parent changes reset children  
✅ Disabled state prevents invalid selections  
✅ Data saves and loads correctly  

### Teams Management
✅ Teams CRUD works  
✅ Members can be added/removed  
✅ Roles can be changed  
✅ Duplicate prevention works  
✅ Visual hierarchy clear  
✅ Member counts accurate  

---

## If You Find Bugs

1. Note the exact steps to reproduce
2. Check browser console for errors
3. Check Network tab for failed requests
4. Let me know what happened vs what should happen

---

## Current Status

- ✅ Server running
- ✅ No compilation errors
- ⏳ Manual testing in progress
- ⬜ All tests passed
- ⬜ Ready for production

---

**You can now test both features in the browser!** 🎉

The app is ready at: **http://localhost:5173/**
