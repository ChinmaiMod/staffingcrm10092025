# Advanced Filtering - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Open the Filter Builder
Click the **🔍 Advanced Filter** button (purple gradient) in the Contacts section.

### Step 2: Build Your Filter
1. Select a **Field** (what to filter)
2. Choose an **Operator** (how to compare)
3. Enter a **Value** (what to look for)
4. Add more conditions or groups as needed

### Step 3: Apply
Click **Apply Filter** to see results instantly.

---

## 📋 Common Filter Examples

### 🎯 Find H1B Java Developers with 5+ Years

**Filter Setup**:
- Field: `visa_status` | Operator: `equals` | Value: `H1B`
- **AND**
- Field: `job_title` | Operator: `contains` | Value: `Java`
- **AND**
- Field: `years_experience` | Operator: `is` | Value: `5-7` (or higher)

**Use Case**: Identify experienced Java developers eligible for H1B sponsorship.

---

### 👥 Find Ready-to-Market Candidates

**Filter Setup**:

**Group 1**:
- Field: `status` | Operator: `equals` | Value: `Resume prepared and sent for review`

**OR** (between groups)

**Group 2**:
- Field: `status` | Operator: `equals` | Value: `Assigned to Recruiter`

**Use Case**: See all candidates ready for active job marketing.

---

### 🆕 Find New Contacts (Name Starting with "Aa")

**Filter Setup**:
- Field: `first_name` | Operator: `starts_with` | Value: `Aa`

**Use Case**: Find candidates whose first name starts with "Aa".

---

### 🏥 Healthcare Candidates in California or Texas

**Filter Setup**:

**Group 1**:
- Field: `contact_type` | Operator: `equals` | Value: `healthcare_candidate`
- **AND**
- Field: `state` | Operator: `equals` | Value: `California`

**OR** (between groups)

**Group 2**:
- Field: `contact_type` | Operator: `equals` | Value: `healthcare_candidate`
- **AND**
- Field: `state` | Operator: `equals` | Value: `Texas`

**Use Case**: Target healthcare recruitment in specific states.

---

### 💼 Experienced Candidates (10+ Years)

**Filter Setup**:
- Field: `years_experience` | Operator: `is` | Value: `10-15`

**OR** (within group)

- Field: `years_experience` | Operator: `is` | Value: `15+`

**Use Case**: Find senior-level candidates for leadership roles.

---

### 📧 Contacts with Email but No Phone

**Filter Setup**:
- Field: `email` | Operator: `is_not_empty` | Value: _(leave empty)_
- **AND**
- Field: `phone` | Operator: `is_empty` | Value: _(leave empty)_

**Use Case**: Identify contacts missing phone numbers for data cleanup.

---

### 🔍 Active Recruitment Pipeline

**Filter Setup**:

**Group 1**:
- Field: `status` | Operator: `equals` | Value: `Spoke to candidate`

**OR**

**Group 2**:
- Field: `status` | Operator: `equals` | Value: `Resume needs to be prepared`

**OR**

**Group 3**:
- Field: `status` | Operator: `equals` | Value: `Resume prepared and sent for review`

**OR**

**Group 4**:
- Field: `status` | Operator: `equals` | Value: `Assigned to Recruiter`

**Use Case**: See all candidates actively in the recruitment pipeline.

---

### 🌟 Green Card or US Citizen Only

**Filter Setup**:
- Field: `visa_status` | Operator: `equals` | Value: `Green Card`

**OR** (within group)

- Field: `visa_status` | Operator: `equals` | Value: `US Citizen`

**Use Case**: Find candidates who don't require sponsorship.

---

### 🏢 Vendors for Empanelment

**Filter Setup**:
- Field: `contact_type` | Operator: `equals` | Value: `vendor_client`
- **AND**
- Field: `reason_for_contact` | Operator: `equals` | Value: `Empanelment`

**Use Case**: Track vendor empanelment progress.

---

### 🎓 Entry-Level Python Developers

**Filter Setup**:
- Field: `job_title` | Operator: `contains` | Value: `Python`
- **AND**
- Field: `years_experience` | Operator: `is` | Value: `0` **OR** `1-3`

**Use Case**: Find junior Python developers for entry-level positions.

---

## 💡 Pro Tips

### Tip 1: Use Groups for OR Logic
When you want "this OR that", create **separate groups** instead of conditions.

✅ **Good**:
```
Group 1: Status = "Placed"
  OR
Group 2: Status = "Marketing"
```

❌ **Less Clear**:
```
Group 1: Status = "Placed" OR Status = "Marketing"
```

---

### Tip 2: Start Simple, Add Complexity
1. Start with 1-2 conditions
2. Test the results
3. Add more conditions to refine
4. Don't build 10 conditions at once!

---

### Tip 3: Use "Contains" for Flexible Matching
Instead of exact job title matches, use `contains`:
- `job_title contains "Java"` matches "Java Developer", "Senior Java Engineer", etc.

---

### Tip 4: Check Your Logic
If you get 0 results, check for conflicts:
- ❌ `Status = "Placed" AND Status = "Initial"` (impossible!)
- ✅ `Status = "Placed" OR Status = "Initial"` (correct)

---

### Tip 5: Clear and Rebuild
If stuck, click **✕ Clear Advanced Filter** and start fresh.

---

## 🎨 Operator Cheat Sheet

| Operator | When to Use | Example |
|----------|-------------|---------|
| `equals` | Exact match | `email equals "john@example.com"` |
| `contains` | Partial match | `job_title contains "Java"` |
| `starts_with` | Begins with | `first_name starts_with "Jo"` |
| `ends_with` | Ends with | `email ends_with "@gmail.com"` |
| `is_empty` | Field is blank | `phone is_empty` |
| `is_not_empty` | Field has value | `email is_not_empty` |
| `not_equals` | Not matching | `status not_equals "Placed"` |
| `not_contains` | Doesn't include | `notes not_contains "spam"` |

---

## ⚡ Keyboard Shortcuts

- **Enter** in value field → Add another condition
- **Esc** → Close filter builder
- **Tab** → Navigate between fields

---

## 🔧 Troubleshooting

### No Results?
1. Check for conflicting conditions
2. Verify spelling and capitalization
3. Use "contains" instead of "equals" for text fields
4. Clear filter and rebuild step-by-step

### Filter Not Working?
1. Ensure at least one condition has a value
2. Check that field names are correct
3. Refresh the page and try again

### Too Many Results?
1. Add more conditions with **AND**
2. Use more specific operators
3. Combine multiple filters

---

## 📊 Field Reference

### Most Commonly Filtered Fields

| Field | Description | Common Values |
|-------|-------------|---------------|
| `status` | Current status | "Initial Contact", "Placed into Job" |
| `contact_type` | Type of contact | "it_candidate", "healthcare_candidate" |
| `visa_status` | Work authorization | "H1B", "Green Card", "US Citizen" |
| `job_title` | Job role | "Java Developer", "Nurse" |
| `years_experience` | Experience level | "0", "1-3", "5-7", "10-15", "15+" |
| `state` | State/Province | "California", "Texas" |
| `first_name` | First name | "John", "Jane" |
| `email` | Email address | "john@example.com" |

---

## 🎯 Advanced Techniques

### Technique 1: Nested OR Logic
To find candidates matching ANY of multiple criteria:

```
Group 1: H1B + Java
  OR
Group 2: Green Card + Python
  OR
Group 3: US Citizen + .NET
```

### Technique 2: Exclusion Filters
To find contacts EXCEPT certain ones:

```
Field: status | Operator: not_equals | Value: "Placed into Job"
AND
Field: status | Operator: not_equals | Value: "Not Interested"
```

### Technique 3: Multi-Field Search
Search across multiple fields at once:

```
Field: first_name | Operator: contains | Value: "John"
  OR
Field: last_name | Operator: contains | Value: "John"
  OR
Field: email | Operator: contains | Value: "John"
```

---

## 📞 Need Help?

1. **Check the full documentation**: `ADVANCED_FILTERING_FEATURE.md`
2. **Review examples**: This guide has 10+ real-world examples
3. **Test incrementally**: Build filter step-by-step
4. **Clear and retry**: Start fresh if stuck

---

**Happy Filtering!** 🎉
