# Teams Management - User Guide

## Quick Start Guide: Creating Teams and Adding Members

### Overview
Teams allow you to organize your internal staff into groups with designated Leads and Recruiters. Each team can be associated with a specific business or work across all businesses.

---

## Step 1: Navigate to Teams Management

1. Log in to your Staffing CRM
2. Click **"Data Administration"** from the left sidebar (⚙️ icon)
3. Click on **"Teams"** from the list of reference tables

---

## Step 2: Create a New Team

### Option A: From Empty State (First Time)
If you don't have any teams yet, you'll see an empty state with a message "No Teams".

1. Click the **"+ Add Team"** button in the center of the page

### Option B: When Teams Exist
If teams already exist:

1. Click the **"+ Add Team"** button in the top-right corner of the page

---

## Step 3: Fill Out Team Information

A form will appear with the following fields:

### Required Fields
- **Team Name** (marked with red *): Enter a descriptive name for your team
  - Examples: "IT Staffing Team A", "Healthcare Recruiters - West Coast", "Sales Team"

### Optional Fields
- **Business**: Select a specific business unit or leave as "All Businesses"
  - If selected, the team will be associated with that business
  - If left blank, the team works across all businesses

- **Description**: Add details about the team's purpose or responsibilities
  - Examples: "Focuses on healthcare placements in California region"

- **Active**: Checkbox (checked by default)
  - Uncheck to deactivate the team without deleting it

### Example:
```
Team Name: Healthcare Recruiters - East
Business: HealthStaff Solutions
Description: Manages all RN and LPN placements in eastern states
Active: ✓
```

---

## Step 4: Save the Team

1. Click the **"Create Team"** button (blue button)
2. The form will close and your new team will appear in the table
3. You'll see the team with **0 members** initially

**Note:** To cancel without saving, click the **"Cancel"** button

---

## Step 5: Add Team Members

Now that your team is created, you need to add staff members as either **Leads** or **Recruiters**.

### Open the Team Members Modal

1. Find your team in the teams table
2. In the "Actions" column, click the **"👥 Members"** button
3. A modal window will open showing the current members (empty for new teams)

---

## Step 6: Assign Staff to the Team

### Add Your First Member

1. In the Team Members modal, click the **"+ Add Member"** button
2. Two dropdown fields will appear:
   - **Select Staff**: Choose from your internal staff list
   - **Select Role**: Choose either **LEAD** or **RECRUITER**

### Understanding Roles

**LEAD (Team Lead)**
- Supervises the team
- Manages recruiters
- Typically has higher-level responsibilities
- Displayed with a **blue background** in the members list

**RECRUITER**
- Team member who works under a Lead
- Handles candidate placements and recruiting tasks
- Displayed with a **white background** and **green badge**

### Example Team Structure:
```
Team: Healthcare Recruiters - East
├── LEAD: John Smith (assigned as Lead)
├── RECRUITER: Sarah Johnson
├── RECRUITER: Mike Davis
└── RECRUITER: Emily Chen
```

---

## Step 7: Complete Member Assignment

1. **Select a staff member** from the "Select Staff" dropdown
2. **Select their role** (LEAD or RECRUITER)
3. Click **"Add Member"**
4. The member will immediately appear in the team list above

**Note:** 
- You can add multiple Leads if needed
- Each staff member can only be added once per team
- If you try to add the same person twice, you'll get an error

---

## Step 8: Manage Team Members

### View Current Members
The members modal shows two sections:

**📊 Leads** (Blue background)
- Shows all staff assigned as Leads
- Includes their role badge and assignment date

**👥 Recruiters** (White background with green badges)
- Shows all staff assigned as Recruiters
- Includes their role badge and assignment date

### Change a Member's Role

1. Find the member in the list
2. Click the **dropdown** next to their name showing their current role
3. Select the new role (LEAD or RECRUITER)
4. Click **"Update"** to confirm
5. The member will move to the appropriate section

### Remove a Member

1. Find the member you want to remove
2. Click the **"Remove"** button (red button)
3. Confirm the removal in the popup dialog
4. The member will be removed from the team

### Close the Members Modal

1. Click the **"Close"** button at the bottom
2. Or click the **"×"** in the top-right corner
3. The main Teams page will refresh showing the updated member count

---

## Step 9: View and Edit Teams

### View Team Details
The teams table shows:
- **Team Name** with description below
- **Business** association (badge)
- **Member Count** (e.g., "3 members")
- **Status** (Active/Inactive)
- **Last Updated** date

### Edit a Team

1. Click the **"✏️ Edit"** button in the Actions column
2. The form will open with current team information
3. Make your changes
4. Click **"Update Team"** to save

### Delete a Team

1. Click the **"🗑️ Delete"** button in the Actions column
2. Read the confirmation message (warns about member removal)
3. Click **"OK"** to confirm deletion
4. The team and all member assignments will be permanently deleted

**Warning:** Deletion cannot be undone!

---

## Advanced Features

### Search and Filter Teams

**Search Box:**
- Type in the search box to filter by team name or description
- Results update instantly as you type

**Business Filter:**
- Select a business from the dropdown to see only teams for that business
- Choose "All Businesses" to see everything

**Status Filter:**
- Filter by "Active" or "Inactive" teams
- Choose "All Statuses" to see everything

**Combine Filters:**
- Use search + business + status filters together
- Example: Search "sales" + filter by "TechStaff Inc" + show only "Active"

---

## Best Practices

### Team Structure Recommendations

1. **Keep Teams Focused**
   - Create teams based on specialization (IT, Healthcare, etc.)
   - Or by region (East Coast, West Coast, etc.)
   - Or by client type (Enterprise, SMB, etc.)

2. **Assign Clear Leads**
   - Each team should have at least one Lead
   - Leads should have manageable team sizes (5-10 recruiters)

3. **Regular Updates**
   - Update team descriptions as responsibilities change
   - Remove inactive members promptly
   - Deactivate teams instead of deleting when no longer needed

### Naming Conventions

Good team names:
✅ "IT Staffing - West Coast"
✅ "Healthcare RN Recruiters"
✅ "Enterprise Sales Team A"

Avoid:
❌ "Team 1"
❌ "John's Team"
❌ "Temp"

---

## Common Scenarios

### Scenario 1: Creating a Regional Team
```
Step 1: Create Team
- Name: "IT Recruiters - California"
- Business: "TechStaff Solutions"
- Description: "Handles all IT placements in California"

Step 2: Add Members
- Add Sarah as LEAD
- Add Mike as RECRUITER
- Add Lisa as RECRUITER
- Add Tom as RECRUITER
```

### Scenario 2: Creating a Cross-Business Team
```
Step 1: Create Team
- Name: "Executive Search Team"
- Business: (leave blank - "All Businesses")
- Description: "Handles C-level and VP placements across all divisions"

Step 2: Add Members
- Add Jennifer as LEAD
- Add Robert as RECRUITER
```

### Scenario 3: Promoting a Recruiter to Lead
```
Step 1: Open team members modal
Step 2: Find recruiter in the list
Step 3: Click role dropdown → Select "LEAD"
Step 4: Click "Update"
Step 5: Member moves to Leads section
```

---

## Troubleshooting

### Problem: Can't add a staff member to team
**Solution:** Check if they're already a member of that team. Each person can only be added once per team.

### Problem: Team member doesn't appear in dropdown
**Solution:** Verify the staff member is marked as "Active" in the Internal Staff table.

### Problem: Can't delete a team
**Solution:** You must confirm the deletion. The warning message reminds you that all member assignments will be removed.

### Problem: Member count not updating
**Solution:** Close the members modal - the count refreshes automatically when you close it.

---

## Video Tutorial

For a visual walkthrough, watch our video tutorial:
*[Coming soon - link to be added]*

---

## Need Help?

- **Technical Issues:** Contact your system administrator
- **Questions:** Click "Suggestions/Ideas ?" in the left sidebar
- **Bug Reports:** Click "Report an Issue" in the left sidebar

---

## Quick Reference Card

```
CREATE TEAM:
1. Data Administration → Teams
2. Click "+ Add Team"
3. Enter team name (required)
4. Select business (optional)
5. Add description (optional)
6. Click "Create Team"

ADD MEMBERS:
1. Find team in table
2. Click "👥 Members"
3. Click "+ Add Member"
4. Select staff + role
5. Click "Add Member"

MANAGE MEMBERS:
- Change Role: Dropdown → Select new role → Update
- Remove: Click "Remove" → Confirm
- Close: Click "Close" or X
```

---

## Summary

You've learned how to:
✅ Navigate to Teams management
✅ Create a new team with name, business, and description
✅ Add staff members as Leads or Recruiters
✅ Change member roles
✅ Remove members from teams
✅ Edit and delete teams
✅ Search and filter teams

**Next Steps:**
- Create your first team
- Add members to get started
- Explore how teams integrate with other CRM features (coming soon)

---

*Last Updated: October 14, 2025*
*Version: 1.0*
