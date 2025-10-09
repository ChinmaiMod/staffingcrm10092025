# Advanced Filtering Feature - Complete Documentation

## Overview

The Advanced Filtering feature provides a powerful visual query builder for creating complex contact filters using AND/OR logic. This allows users to build sophisticated queries without writing any SQL code.

## Feature Highlights

✅ **Visual Query Builder** - Drag-and-drop style interface for building filters  
✅ **Multiple Filter Groups** - Combine groups with AND/OR logic  
✅ **Multiple Conditions per Group** - Each group can have multiple conditions  
✅ **15+ Searchable Fields** - Filter by name, email, status, job title, visa, experience, and more  
✅ **8 Text Operators** - equals, contains, starts with, ends with, is empty, etc.  
✅ **Real-time Filtering** - Instant results as you build your query  
✅ **Human-Readable Descriptions** - See exactly what filters are active  
✅ **Persistent Filters** - Filters remain active until manually cleared

## Use Cases

### Recruitment Scenarios

1. **H1B Candidates with Java Experience**
   - Filter: `Visa Status = 'H1B' AND Job Title contains 'Java' AND Years Experience >= 5`
   - Use: Find experienced Java developers eligible for H1B sponsorship

2. **Ready-to-Market Candidates**
   - Filter: `Status = 'Resume prepared and sent for review' OR Status = 'Assigned to Recruiter'`
   - Use: Identify candidates ready for active job marketing

3. **New Contacts This Week**
   - Filter: `Created Date >= 'This Week' AND Status = 'Initial Contact'`
   - Use: Follow up with newly added contacts

4. **Healthcare Candidates in Specific States**
   - Filter: `Contact Type = 'healthcare_candidate' AND (State = 'California' OR State = 'Texas' OR State = 'New York')`
   - Use: Target healthcare recruitment in specific regions

5. **Senior Candidates Not Responding**
   - Filter: `Years Experience >= 10 AND Status = 'Spoke to candidate' AND Last Contact >= 7 days ago`
   - Use: Re-engage experienced candidates who went silent

### Sales/Business Development Scenarios

1. **Vendors for Empanelment**
   - Filter: `Contact Type = 'vendor_client' AND Reason for Contact = 'Empanelment'`
   - Use: Track vendor empanelment progress

2. **Internal Hires in USA**
   - Filter: `Contact Type = 'internal_usa' AND Country = 'USA'`
   - Use: Manage US-based internal recruitment

## User Interface Walkthrough

### Opening the Advanced Filter Builder

1. Navigate to **Contacts** section
2. Look for the **🔍 Advanced Filter** button (purple gradient)
3. Click to open the filter builder modal

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Contacts Manager                                        │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────────────┐  │
│  │ Search │  │  Type  │  │ Status │  │ 🔍 Advanced    │  │
│  │   🔍   │  │   ▼    │  │   ▼    │  │    Filter       │  │
│  └────────┘  └────────┘  └────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Building a Filter

The filter builder has three main sections:

#### 1. Filter Groups
Each group represents a set of conditions combined with AND/OR logic.

```
┌───────────────────────────────────────────────────────────┐
│  GROUP 1                                         AND  ▼   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Field: Job Title    │ Operator: contains  │        │   │
│  │ Value: [Java      ]                               │   │
│  │                                           ✕ Remove │   │
│  └────────────────────────────────────────────────────┘   │
│  + Add Condition                                          │
└───────────────────────────────────────────────────────────┘
```

#### 2. Conditions within Groups
Each condition has three parts:
- **Field**: What to filter (name, status, job_title, etc.)
- **Operator**: How to compare (equals, contains, starts with, etc.)
- **Value**: What to look for

#### 3. Logical Operators
- **Within Group**: Choose AND or OR between conditions in the same group
- **Between Groups**: Choose AND or OR between different groups

### Example: Complex Filter

**Goal**: Find H1B Java developers with 5+ years OR Ready-to-market candidates

```
┌─────────────────────────────────────────────────────────────┐
│  Advanced Filter Builder                              [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GROUP 1                                          AND  ▼   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Visa Status    equals       H1B              ✕       │  │
│  │ Job Title      contains     Java             ✕       │  │
│  │ Years Exp      >=           5                ✕       │  │
│  └──────────────────────────────────────────────────────┘  │
│  + Add Condition                                           │
│                                                             │
│                         OR                                  │
│                                                             │
│  GROUP 2                                          AND  ▼   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Status         equals       Resume prepared  ✕       │  │
│  └──────────────────────────────────────────────────────┘  │
│  + Add Condition                                           │
│                                                             │
│  + Add Group                                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                      [Cancel] [Apply Filter]│
└─────────────────────────────────────────────────────────────┘
```

**Result**: Contacts that match EITHER:
- H1B status AND Java in job title AND 5+ years experience
- OR Resume prepared status

### Active Filter Display

When a filter is active, you'll see a purple badge showing the filter description:

```
┌─────────────────────────────────────────────────────────────┐
│  Active Filter:                                             │
│  (visa_status equals 'H1B' AND job_title contains 'Java'    │
│   AND years_experience >= 5) OR                             │
│  (status equals 'Resume prepared and sent for review')      │
│                                          ✕ Clear Advanced   │
└─────────────────────────────────────────────────────────────┘
```

## Available Fields

| Field Name | Description | Example Values |
|------------|-------------|----------------|
| `first_name` | First name | "John", "Jane" |
| `last_name` | Last name | "Smith", "Doe" |
| `email` | Email address | "john@example.com" |
| `phone` | Phone number | "+1-555-0100" |
| `contact_type` | Type of contact | "it_candidate", "healthcare_candidate" |
| `status` | Current status | "Initial Contact", "Placed into Job" |
| `job_title` | Job title | "Java Developer", "Nurse" |
| `visa_status` | Visa/work authorization | "H1B", "Green Card", "US Citizen" |
| `years_experience` | Years of experience | "0", "1-3", "5-7", "10-15", "15+" |
| `current_employer` | Current company | "Google", "Microsoft" |
| `preferred_location` | Preferred work location | "California", "Remote" |
| `reason_for_contact` | Why contacted | "Training", "Marketing", "H1B Transfer" |
| `city` | City | "San Francisco", "New York" |
| `state` | State | "California", "Texas" |
| `country` | Country | "USA", "India" |

## Operator Reference

### Text Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match (case-insensitive) | name equals "John" |
| `contains` | Contains substring | job_title contains "Java" |
| `starts_with` | Starts with text | name starts_with "Jo" |
| `ends_with` | Ends with text | email ends_with "@gmail.com" |
| `not_equals` | Does not match | status not_equals "Placed" |
| `not_contains` | Does not contain | notes not_contains "unresponsive" |
| `is_empty` | Field is empty/null | email is_empty |
| `is_not_empty` | Field has a value | phone is_not_empty |

### Select Field Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `is` | Equals (for dropdowns) | visa_status is "H1B" |
| `is_not` | Not equals | contact_type is_not "vendor_client" |
| `is_empty` | Not selected | job_title is_empty |
| `is_not_empty` | Has a selection | status is_not_empty |

## Filter Logic Examples

### AND Logic (All conditions must match)

**Filter**: Name starts with "A" AND Status = "Placed"

```javascript
{
  groups: [
    {
      conditions: [
        { field: "first_name", operator: "starts_with", value: "A" },
        { field: "status", operator: "equals", value: "Placed into Job" }
      ],
      logicalOperator: "AND"
    }
  ],
  groupLogicalOperator: "AND"
}
```

**Matches**: 
- ✅ Alice, Status: Placed
- ❌ Alice, Status: Initial Contact (status doesn't match)
- ❌ Bob, Status: Placed (name doesn't match)

### OR Logic (Any condition can match)

**Filter**: Status = "Placed" OR Status = "Marketing"

```javascript
{
  groups: [
    {
      conditions: [
        { field: "status", operator: "equals", value: "Placed into Job" },
        { field: "status", operator: "equals", value: "Recruiter started marketing" }
      ],
      logicalOperator: "OR"
    }
  ]
}
```

**Matches**: 
- ✅ John, Status: Placed
- ✅ Jane, Status: Marketing
- ❌ Bob, Status: Initial Contact

### Complex Mixed Logic

**Filter**: (H1B AND Java) OR (Green Card AND Python)

```javascript
{
  groups: [
    {
      conditions: [
        { field: "visa_status", operator: "equals", value: "H1B" },
        { field: "job_title", operator: "contains", value: "Java" }
      ],
      logicalOperator: "AND"
    },
    {
      conditions: [
        { field: "visa_status", operator: "equals", value: "Green Card" },
        { field: "job_title", operator: "contains", value: "Python" }
      ],
      logicalOperator: "AND"
    }
  ],
  groupLogicalOperator: "OR"
}
```

**Matches**:
- ✅ H1B + Java Developer
- ✅ Green Card + Python Developer
- ❌ H1B + Python Developer (doesn't match either group)
- ❌ Green Card + Java Developer (doesn't match either group)

## Best Practices

### 1. Start Simple
Begin with a single condition and add more as needed. Don't overcomplicate initially.

### 2. Use Groups for OR Logic
When you need "this OR that", create separate groups rather than conditions.

**Good**:
```
Group 1: Status = "Placed"
  OR
Group 2: Status = "Marketing"
```

**Less Clear**:
```
Group 1: Status = "Placed" OR Status = "Marketing"
```

### 3. Order Matters for Performance
Put most restrictive conditions first (within a group) for better performance.

**Better**:
```
1. Visa Status = "H1B"      (eliminates 60% of records)
2. Years Exp >= 5           (eliminates another 30%)
3. Name contains "John"     (final refinement)
```

### 4. Save Common Filters
If you use the same filter repeatedly, consider adding it as a preset (feature coming soon).

### 5. Test Your Filter
After building a complex filter, check the results count. If it's 0, you might have conflicting conditions.

**Example of Conflict**:
```
Status = "Placed" AND Status = "Initial Contact"  ❌ Impossible!
```

Should be:
```
Status = "Placed" OR Status = "Initial Contact"   ✅ Correct
```

## Technical Architecture

### Components

1. **AdvancedFilterBuilder.jsx**
   - Visual filter builder UI
   - Manages groups, conditions, operators
   - 350+ lines of React code
   - Inline styled-jsx for styling

2. **filterEngine.js**
   - Core filtering logic
   - Client-side filter execution
   - Query builder for Supabase (future)
   - Pure JavaScript utilities

3. **ContactsManager.jsx**
   - Integration point
   - State management
   - UI display of active filters

### Data Flow

```
User Input → AdvancedFilterBuilder
              ↓
          Filter Config Object
              ↓
       handleApplyAdvancedFilters()
              ↓
       applyAdvancedFilters()
              ↓
       Filtered Contact List
              ↓
          Table Display
```

### Filter Config Structure

```javascript
{
  groups: [
    {
      id: 1,
      conditions: [
        {
          id: 1,
          field: "visa_status",
          operator: "equals",
          value: "H1B"
        },
        {
          id: 2,
          field: "job_title",
          operator: "contains",
          value: "Java"
        }
      ],
      logicalOperator: "AND"  // AND/OR within group
    }
  ],
  groupLogicalOperator: "OR"  // AND/OR between groups
}
```

## Future Enhancements

### Planned Features

1. **Filter Presets**
   - Save commonly used filters
   - Quick-apply templates
   - Share filters with team

2. **Save/Load Filters**
   - Persist to database
   - Name and organize filters
   - Filter history

3. **Server-Side Filtering**
   - Use `buildSupabaseQuery()` for large datasets
   - Improved performance
   - Pagination support

4. **Date Range Filters**
   - Filter by created_date, updated_date
   - Relative dates ("last 7 days", "this month")
   - Custom date ranges

5. **Export Filtered Results**
   - Export to CSV/Excel
   - Include only visible columns
   - Bulk actions on filtered set

6. **Filter Analytics**
   - Most used filters
   - Filter performance metrics
   - Suggested filters based on usage

## Troubleshooting

### Filter Returns No Results

**Problem**: Applied filter but seeing "No Contacts Found"

**Solutions**:
1. Check for conflicting conditions (e.g., Status = "A" AND Status = "B")
2. Verify values match exactly (check capitalization for non-text fields)
3. Clear filter and rebuild step-by-step
4. Check if AND should be OR or vice versa

### Filter Not Applying

**Problem**: Clicked "Apply Filter" but nothing changed

**Solutions**:
1. Ensure at least one condition has a value
2. Check browser console for errors (F12)
3. Refresh the page and try again
4. Verify field names are correct

### Performance Issues

**Problem**: Filtering is slow with many contacts

**Solutions**:
1. Use more specific conditions early in the group
2. Avoid using "contains" on very large text fields
3. Consider using basic filters (search, type, status) first
4. Future: Enable server-side filtering for large datasets

### Filter Description Too Long

**Problem**: Active filter text is truncated

**Solutions**:
1. Use shorter condition values when possible
2. Reduce number of conditions by combining logically
3. Future: Tooltip showing full filter description

## FAQ

**Q: Can I save my filters?**  
A: Not yet. Filter save/load functionality is planned for a future update.

**Q: How many conditions can I add?**  
A: Unlimited, but for performance, keep it under 20 conditions total.

**Q: Can I filter by date ranges?**  
A: Not in the current version. Date filtering is planned for future releases.

**Q: Do filters persist after page reload?**  
A: No, filters are cleared on reload. Save/load feature coming soon.

**Q: Can I export filtered contacts?**  
A: Not directly from the filter. Use the existing export feature with active filters.

**Q: Are filters case-sensitive?**  
A: No, all text comparisons are case-insensitive.

**Q: Can I search across multiple fields at once?**  
A: Yes! Use OR logic between conditions in the same group.

**Q: What's the difference between "equals" and "is"?**  
A: They're the same - "equals" is for text fields, "is" is for dropdowns (select fields).

## Support

For issues or feature requests related to Advanced Filtering:

1. Check this documentation first
2. Review the filter description to verify your logic
3. Clear filter and rebuild to isolate the issue
4. Document the steps to reproduce and report to admin

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Created By**: Staffing CRM Development Team
