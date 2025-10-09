# Contact Status Tracking Feature

## Overview

The Contact Status Tracking feature automatically tracks all status changes for contacts in your CRM, requiring mandatory remarks/comments to explain each status change. This creates a comprehensive audit trail and ensures proper documentation of the contact's journey.

---

## Key Features

### 1. **Mandatory Remarks for Status Changes**
- When editing a contact's status, a modal automatically appears
- Users must provide detailed remarks (minimum 10 characters)
- Status change cannot be saved without remarks
- Ensures every status transition is documented

### 2. **Complete Status History**
- View full timeline of all status changes
- See who made each change and when
- Read detailed remarks for each transition
- Visual timeline with old → new status display

### 3. **Database Tracking**
- All status changes stored in `contact_status_history` table
- Automatic logging via database trigger
- Linked to user who made the change
- Immutable history (cannot be edited after saving)

---

## User Guide

### Changing a Contact's Status

1. **Open Contact for Editing**
   - Navigate to Contacts → Select a contact → Click "Edit"

2. **Change the Status Field**
   - Find the "Status" dropdown in the contact form
   - Select a new status (e.g., "Initial Contact" → "Spoke to candidate")

3. **Status Change Modal Appears**
   - A modal window automatically pops up
   - Shows the old and new status
   - Contains a remarks text area

4. **Enter Remarks** (Required)
   - Explain why the status is changing
   - Provide context and next steps
   - Minimum 10 characters required
   - Example: "Had a detailed conversation with the candidate. They are actively looking for remote opportunities and have 5+ years of Java experience. Interested in full-stack roles with Spring Boot and React."

5. **Confirm or Cancel**
   - Click "Confirm Status Change" to proceed
   - Click "Cancel" to revert the status change
   - You can also close the modal to cancel

6. **Save the Contact**
   - After confirming remarks, save the contact form
   - Status change and remarks are permanently recorded

### Viewing Status History

1. **Open Contact Details**
   - Navigate to Contacts → Click on a contact name

2. **Switch to Status History Tab**
   - Click the "Status History" tab (shows count of changes)

3. **Review Timeline**
   - See all status changes in reverse chronological order (newest first)
   - Each entry shows:
     - Old status → New status
     - Detailed remarks
     - Who made the change
     - When it was changed (relative time + exact timestamp on hover)

---

## Database Schema

### New Table: `contact_status_history`

```sql
CREATE TABLE contact_status_history (
  history_id uuid PRIMARY KEY,
  contact_id uuid REFERENCES contacts(contact_id),
  changed_by uuid REFERENCES profiles(id),
  old_status text,
  new_status text NOT NULL,
  remarks text NOT NULL,
  changed_at timestamptz DEFAULT now()
);
```

**Fields:**
- `history_id`: Unique identifier for each status change
- `contact_id`: Links to the contact
- `changed_by`: User who made the change
- `old_status`: Previous status (NULL for first status)
- `new_status`: New status being set
- `remarks`: **Mandatory** explanation for the change
- `changed_at`: Timestamp of the change

### Updated Table: `contact_comments`

Added new columns to support status-related comments:

```sql
ALTER TABLE contact_comments 
ADD COLUMN comment_type text DEFAULT 'GENERAL' 
  CHECK (comment_type IN ('GENERAL', 'STATUS_CHANGE'));

ALTER TABLE contact_comments
ADD COLUMN related_status_history_id uuid 
  REFERENCES contact_status_history(history_id);
```

**New Fields:**
- `comment_type`: Differentiates general comments from status change remarks
- `related_status_history_id`: Optional link to specific status change event

---

## Component Architecture

### 1. **StatusChangeModal.jsx**
**Purpose:** Modal that captures remarks when status changes

**Props:**
- `isOpen`: Boolean to show/hide modal
- `oldStatus`: Current status before change
- `newStatus`: New status being set
- `onConfirm(remarks)`: Callback with user's remarks
- `onCancel()`: Callback to cancel the change

**Features:**
- Visual display of old → new status
- Textarea for remarks (min 10 characters)
- Character counter
- Validation with error messages
- Informational note about permanence

### 2. **StatusHistory.jsx**
**Purpose:** Display timeline of all status changes

**Props:**
- `statusHistory`: Array of status change objects
- `loading`: Boolean for loading state

**Features:**
- Empty state for no history
- Timeline visualization with dots and lines
- Status badges (old strikethrough, new highlighted)
- Relative time display (e.g., "2 days ago")
- Expandable remarks display
- Author attribution

### 3. **ContactForm.jsx** (Updated)
**New State:**
```javascript
const initialStatus = useRef(contact?.status || 'Initial Contact')
const [showStatusModal, setShowStatusModal] = useState(false)
const [pendingStatusChange, setPendingStatusChange] = useState(null)
const [statusChangeRemarks, setStatusChangeRemarks] = useState('')
```

**New Logic:**
- Detects status field changes in `handleChange()`
- Opens modal when status changes on existing contacts
- Stores remarks and includes them in save data
- Passes `statusChanged` and `statusChangeRemarks` to parent

### 4. **ContactDetail.jsx** (Updated)
**New Features:**
- Added "Status History" tab
- Loads status history from database/mock data
- Displays timeline using `StatusHistory` component
- Shows count of changes in tab label

### 5. **ContactsManager.jsx** (Updated)
**New Save Logic:**
```javascript
const { statusChangeRemarks, statusChanged, ...contactFields } = contactData

// If status changed and remarks provided
if (statusChanged && statusChangeRemarks) {
  await supabase.from('contact_status_history').insert({
    contact_id: contact.contact_id,
    old_status: selectedContact.status,
    new_status: contactFields.status,
    remarks: statusChangeRemarks,
    changed_by: user.id
  })
}
```

---

## API Integration (When Connected to Supabase)

### Saving Status History

```javascript
import { supabase } from '../api/supabaseClient'

// After updating contact
const { data, error } = await supabase
  .from('contact_status_history')
  .insert({
    contact_id: contactId,
    old_status: oldStatus,
    new_status: newStatus,
    remarks: remarks,
    changed_by: session.user.id
  })
```

### Loading Status History

```javascript
const { data: statusHistory, error } = await supabase
  .from('contact_status_history')
  .select(`
    *,
    changed_by_profile:profiles!changed_by(full_name)
  `)
  .eq('contact_id', contactId)
  .order('changed_at', { ascending: false })
```

---

## Example Workflow

### Scenario: Moving a candidate from "Initial Contact" to "Spoke to candidate"

1. **User Action:**
   - Opens contact "John Doe"
   - Clicks "Edit Contact"
   - Changes status from "Initial Contact" to "Spoke to candidate"

2. **System Response:**
   - Detects status change
   - Opens StatusChangeModal
   - Shows: "Initial Contact" → "Spoke to candidate"

3. **User Input:**
   - Enters remarks: "Had a 30-minute call with John. He's interested in remote Java positions with Spring Boot. Available to start in 2 weeks. Will send him our current openings."

4. **User Confirms:**
   - Clicks "Confirm Status Change"
   - Modal closes, status updates in form
   - User clicks "Update Contact"

5. **System Saves:**
   - Updates contact status to "Spoke to candidate"
   - Creates entry in `contact_status_history`:
     ```json
     {
       "contact_id": "uuid-123",
       "old_status": "Initial Contact",
       "new_status": "Spoke to candidate",
       "remarks": "Had a 30-minute call with John...",
       "changed_by": "user-uuid",
       "changed_at": "2025-10-07T10:30:00Z"
     }
     ```

6. **Viewing History:**
   - User opens contact detail
   - Clicks "Status History (1)"
   - Sees timeline with the status change and remarks

---

## Best Practices

### Writing Good Remarks

**✅ Good Examples:**
- "Candidate confirmed availability for interview next Tuesday at 2 PM. Sending calendar invite and technical assessment link."
- "Client declined our proposal due to budget constraints. Will follow up in Q2 when their budget resets."
- "Resume updated with recent certifications. Moving to active marketing with updated profile."

**❌ Poor Examples:**
- "Updated" (too vague)
- "OK" (no context)
- "Status changed" (obvious, no value)

### Guidelines:
1. **Be Specific**: What happened? What was discussed?
2. **Include Next Steps**: What will happen next?
3. **Add Context**: Why is this change happening?
4. **Use Full Sentences**: Make it readable for others
5. **Think Future**: Will this make sense in 6 months?

---

## Migration Guide

### Applying the Database Changes

1. **Copy Migration File:**
   ```
   supabase/migrations/008_contact_status_history.sql
   ```

2. **Apply via Supabase Dashboard:**
   - Go to your Supabase project
   - Open SQL Editor
   - Paste the migration SQL
   - Click "Run"

3. **Or via CLI:**
   ```bash
   supabase db push
   ```

### Existing Contacts

- Existing contacts won't have status history
- History starts being recorded from first status change after migration
- Optionally, you can create initial history entries:
  ```sql
  INSERT INTO contact_status_history (contact_id, new_status, remarks, changed_at)
  SELECT contact_id, status, 'Initial status', created_at
  FROM contacts
  WHERE status IS NOT NULL;
  ```

---

## Troubleshooting

### Modal Doesn't Appear
**Issue:** Status changes without showing modal
**Solution:** 
- Check that you're editing an existing contact (not creating new)
- Verify StatusChangeModal is imported in ContactForm
- Check browser console for errors

### Can't Save Without Remarks
**Issue:** "Confirm" button is disabled
**Solution:**
- Enter at least 10 characters in remarks field
- Check for any error messages below the textarea

### Status History Tab is Empty
**Issue:** No history showing despite status changes
**Solution:**
- Check that `loadStatusHistory()` is being called
- Verify database has `contact_status_history` table
- Check console for API errors
- Ensure RLS policies allow reading history

### Old Statuses Not Showing
**Issue:** History only shows new status
**Solution:**
- Verify `old_status` is being captured correctly
- Check that initial status is stored in useRef
- May be expected for first status on new contacts

---

## Future Enhancements

### Planned Features:
1. **Filter by Status Change**: Filter contacts who changed status in last 7/30 days
2. **Bulk Status Update**: Update multiple contacts with same remarks
3. **Status Change Notifications**: Email alerts when specific status changes occur
4. **Export Status History**: Download timeline as PDF or Excel
5. **Status Change Analytics**: Dashboard showing common status transitions
6. **Custom Status Workflows**: Define required statuses and transitions
7. **Reminder System**: Set reminders based on status changes

---

## Support

### Need Help?
- Check console logs for errors
- Review `LOCAL_SUPABASE_SETUP.md` for database setup
- Verify all components are properly imported
- Check that migration was applied successfully

### Common Files:
- Migration: `supabase/migrations/008_contact_status_history.sql`
- Modal: `src/components/CRM/Contacts/StatusChangeModal.jsx`
- History View: `src/components/CRM/Contacts/StatusHistory.jsx`
- Form Logic: `src/components/CRM/Contacts/ContactForm.jsx`
- Detail View: `src/components/CRM/Contacts/ContactDetail.jsx`
- Manager: `src/components/CRM/Contacts/ContactsManager.jsx`

---

**Last Updated:** October 7, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Production
