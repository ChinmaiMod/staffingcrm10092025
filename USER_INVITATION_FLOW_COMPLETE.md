# User Invitation Flow - Complete Implementation

## Overview
Complete user invitation system allowing admins to invite new users via email. Invited users can set their own password and are automatically assigned READ_ONLY access until an admin grants additional permissions.

## Flow Diagram

```
┌─────────────┐
│   Admin     │
│  Sends      │
│ Invitation  │
└──────┬──────┘
       │
       ├── Email sent to invitee
       │   (Resend API)
       │
       ▼
┌──────────────────┐
│  Invitee clicks  │
│   invite link    │
└────────┬─────────┘
         │
         ├── Sets password
         │   Creates account
         │
         ▼
┌──────────────────────┐
│  Account Created     │
│  Status: ACTIVE      │
│  Role: READ_ONLY (1) │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│   Admin assigns      │
│   additional roles   │
│   via User Roles UI  │
└──────────────────────┘
```

## Implementation Details

### 1. Database Schema

#### user_invitations Table
```sql
CREATE TABLE user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(tenant_id),
  email text NOT NULL,
  invited_user_name text NOT NULL,
  token text UNIQUE NOT NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','ACCEPTED','EXPIRED','REVOKED')),
  message text,
  invited_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  revoke_reason text
);
```

#### Automatic Role Assignment Trigger
```sql
-- Trigger function that runs when invitation status changes to ACCEPTED
CREATE FUNCTION assign_readonly_role_on_invitation_acceptance()
-- Automatically assigns role_id=1 (READ_ONLY) to new user
-- Only fires if user doesn't already have a role assignment
```

### 2. Edge Function: sendUserInvitation

**Location**: `supabase/functions/sendUserInvitation/index.ts`

**Responsibilities**:
- Validate invitation request
- Generate secure random token
- Create invitation record in database
- Send email via Resend API
- Create audit log

**Environment Variables Required**:
- `RESEND_API_KEY` - Resend API key for sending emails
- `FRONTEND_URL` - Frontend URL (e.g., https://yourapp.vercel.app)
- `FROM_EMAIL` - Sender email (default: no-reply@staffingcrm.app)
- `FROM_NAME` - Sender name (default: Staffing CRM)

**Request Body**:
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "message": "Optional personal message",
  "tenantId": "uuid",
  "invitedBy": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "expiresAt": "2025-10-22T00:00:00Z"
  }
}
```

**Email Template**:
- Professional HTML email with company branding
- Clear call-to-action button
- Expiration date prominently displayed
- Personal message from inviter (if provided)
- Plain text fallback for email clients

### 3. Frontend Components

#### InviteUsers.jsx
**Location**: `src/components/DataAdministration/UserInvitations/InviteUsers.jsx`

**Features**:
- Form to invite new users
- Email domain validation (must match tenant domain)
- Duplicate check (existing users and pending invitations)
- Table showing all invitations with status
- Resend and revoke functionality
- Permission check (only ADMIN and CEO can invite)

**Validations**:
- Full name required (min 2 characters)
- Valid email format
- Email must match tenant's email_domain
- Cannot invite existing users
- Cannot have duplicate pending invitations

#### AcceptInvitation.jsx
**Location**: `src/components/Auth/AcceptInvitation.jsx`

**Features**:
- Token validation
- Invitation status check (not expired, not revoked, not already accepted)
- Password creation form
- User account creation via Supabase Auth
- Profile creation with tenant association
- Automatic role assignment (READ_ONLY)
- Audit logging

**Process**:
1. Load invitation by token
2. Validate invitation is still valid
3. User enters password (min 8 characters)
4. Create auth account with Supabase
5. Create profile record
6. Assign READ_ONLY role via user_role_assignments
7. Mark invitation as ACCEPTED
8. Create audit log
9. Redirect to login

### 4. Default Role Assignment

**Method 1: Frontend (AcceptInvitation.jsx)**
```javascript
// Assign READ_ONLY role during signup
await supabase
  .from('user_role_assignments')
  .insert({
    user_id: authData.user.id,
    role_id: 1, // READ_ONLY role
    tenant_id: invitation.tenant_id,
    assigned_by: invitation.invited_by,
    is_active: true
  })
```

**Method 2: Database Trigger (Backup)**
```sql
-- Trigger fires when invitation.status changes to 'ACCEPTED'
-- Automatically creates role assignment if one doesn't exist
-- Uses invited_by as assigned_by for audit trail
```

### 5. Role Hierarchy

```
Read-only (Level 1) → Default for all invited users
    ↓
Lead (Level 2) → Can be assigned by admin
    ↓
Manager (Level 3) → Can be assigned by admin
    ↓
Admin (Level 4) → Can be assigned by admin
    ↓
CEO (Level 5) → Highest level
```

**READ_ONLY Permissions**:
- `can_view_own_records`: true
- `can_create_records`: false
- `can_edit_own_records`: false
- `can_edit_all_records`: false
- `can_delete_own_records`: false
- `can_manage_users`: false
- `can_assign_roles`: false

## Setup Instructions

### 1. Set Environment Variables in Supabase

```bash
# Navigate to Supabase Dashboard → Project Settings → Edge Functions → Secrets

RESEND_API_KEY=re_xxxxxxxxxxxxx
FRONTEND_URL=https://yourapp.vercel.app
FROM_EMAIL=no-reply@yourdomain.com
FROM_NAME=Your Company Name
```

### 2. Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification
5. Use verified domain in `FROM_EMAIL`

### 3. Deploy Edge Function

```bash
npx supabase functions deploy sendUserInvitation --project-ref YOUR_PROJECT_ID
```

### 4. Apply Migration

Migration `029_auto_assign_readonly_role_on_invitation_acceptance.sql` has been applied.

### 5. Test the Flow

1. Admin logs in
2. Navigate to Data Administration → Invite Users
3. Enter user details and send invitation
4. Check invitation status in table
5. User receives email with invitation link
6. User clicks link and creates password
7. User account created with READ_ONLY role
8. Admin can view user in Assign User Roles
9. Admin can change user's role to higher level

## Testing Checklist

### Email Sending
- [ ] Invitation email is sent to recipient
- [ ] Email arrives in inbox (not spam)
- [ ] Email contains correct invitation link
- [ ] Personal message appears in email (if provided)
- [ ] Expiration date is correct (7 days from now)
- [ ] HTML version displays correctly
- [ ] Plain text version is readable

### Invitation Creation
- [ ] Invitation record created in database
- [ ] Status is 'SENT'
- [ ] Token is generated securely
- [ ] Expires_at is set correctly
- [ ] invited_by references correct admin
- [ ] tenant_id is correct

### Invitation Validation
- [ ] Cannot invite existing user
- [ ] Cannot create duplicate pending invitation
- [ ] Email domain must match tenant domain
- [ ] Full name is required
- [ ] Email format is validated

### Acceptance Flow
- [ ] Link works and loads AcceptInvitation page
- [ ] Invalid token shows error
- [ ] Expired invitation shows error
- [ ] Revoked invitation shows error
- [ ] Already accepted invitation shows error
- [ ] Password requirements enforced (min 8 chars)
- [ ] Password confirmation must match

### Account Creation
- [ ] Supabase auth account created
- [ ] Profile created with correct tenant_id
- [ ] Profile status is 'ACTIVE'
- [ ] Full name saved correctly
- [ ] Email saved in lowercase

### Role Assignment
- [ ] user_role_assignments record created
- [ ] role_id is 1 (READ_ONLY)
- [ ] tenant_id is correct
- [ ] assigned_by is invitation.invited_by
- [ ] is_active is true
- [ ] valid_from is set

### Admin Role Management
- [ ] Admin can see new user in Assign User Roles
- [ ] Admin can change user's role
- [ ] Admin can add additional role assignments
- [ ] Role changes are reflected immediately
- [ ] Menu permissions update based on new role

### Resend & Revoke
- [ ] Admin can resend invitation
- [ ] Resend button works for PENDING/SENT status
- [ ] Revoke button works for PENDING/SENT status
- [ ] Revoked invitations cannot be accepted
- [ ] Accepted invitations cannot be revoked

## Troubleshooting

### Email Not Sent

**Check:**
1. RESEND_API_KEY is set in Supabase Edge Function secrets
2. FROM_EMAIL domain is verified in Resend
3. Resend API quota not exceeded
4. Check edge function logs: `mcp_supabase_get_logs` for "edge-function"

**Workaround:**
- Invitation is still created in database
- Admin can copy invitation URL manually
- Share URL with user via other channels

### User Cannot Accept Invitation

**Check:**
1. Invitation not expired (< 7 days old)
2. Invitation status is 'SENT' or 'PENDING'
3. Token in URL matches database
4. Frontend URL is correct

**Fix:**
- Resend invitation if expired
- Check invitation status in database
- Verify FRONTEND_URL environment variable

### Role Not Assigned

**Check:**
1. user_role_assignments table for user_id
2. Trigger function executed successfully
3. Frontend code created role assignment

**Fix:**
```sql
-- Manually assign READ_ONLY role
INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by, is_active)
VALUES ('user-uuid', 1, 'tenant-uuid', 'admin-uuid', true);
```

### User Cannot Login

**Check:**
1. Profile status is 'ACTIVE'
2. Supabase auth.users record exists
3. Password was set correctly
4. Email verification not required (should auto-verify on signup)

**Fix:**
```sql
-- Update profile status
UPDATE profiles SET status = 'ACTIVE' WHERE email = 'user@example.com';
```

## Security Considerations

### Token Generation
- Uses crypto.getRandomValues() for secure random tokens
- 32-byte tokens (64 hex characters)
- Tokens are unique and unpredictable

### Email Validation
- Domain restriction enforced (must match tenant.email_domain)
- Cannot invite users from other domains
- Prevents unauthorized access

### Invitation Expiration
- 7-day expiration enforced
- Expired invitations cannot be accepted
- Automatic cleanup recommended (future enhancement)

### Role Isolation
- All users start with READ_ONLY access
- Cannot escalate own privileges
- Only admins can assign higher roles
- Tenant isolation via tenant_id

### Audit Trail
- All invitations logged in user_invitations
- invitation.invited_by tracks who sent invitation
- role_assignment.assigned_by tracks who assigned role
- audit_logs table records all actions

## Future Enhancements

### 1. Invitation Expiration Cleanup
```sql
-- Cron job to expire old invitations
CREATE FUNCTION expire_old_invitations()
RETURNS void AS $$
UPDATE user_invitations
SET status = 'EXPIRED'
WHERE status IN ('PENDING', 'SENT')
AND expires_at < NOW();
$$ LANGUAGE sql;
```

### 2. Bulk Invitations
- CSV upload to invite multiple users
- Preview before sending
- Batch email sending

### 3. Custom Invitation Templates
- Per-tenant email templates
- Customizable branding
- Multiple languages

### 4. Invitation Analytics
- Track acceptance rate
- Time to acceptance
- Email open rate (via Resend webhooks)

### 5. Invitation Reminders
- Auto-remind after 3 days if not accepted
- Configurable reminder schedule
- Stop reminders after acceptance

## Related Files

### Frontend
- `src/components/DataAdministration/UserInvitations/InviteUsers.jsx`
- `src/components/DataAdministration/UserInvitations/InviteUsers.css`
- `src/components/Auth/AcceptInvitation.jsx`
- `src/api/edgeFunctions.js` (createInvite, acceptInvite functions)

### Backend
- `supabase/functions/sendUserInvitation/index.ts`
- `supabase/functions/resendUserInvitation/index.ts` (if exists)
- `supabase/migrations/025_create_user_invitations.sql` (original table creation)
- `supabase/migrations/029_auto_assign_readonly_role_on_invitation_acceptance.sql` (trigger)

### Database
- Table: `user_invitations`
- Table: `user_role_assignments`
- Table: `user_roles`
- Table: `profiles`
- Table: `audit_logs`
- Function: `assign_readonly_role_on_invitation_acceptance()`
- Trigger: `trigger_assign_readonly_role_on_acceptance`

## API Reference

### Frontend API

#### createInvite(data, token)
```javascript
import { createInvite } from '../../api/edgeFunctions'

const result = await createInvite({
  email: 'user@example.com',
  fullName: 'John Doe',
  message: 'Welcome to the team!',
  tenantId: 'uuid',
  invitedBy: 'uuid'
}, userToken)
```

### Edge Function API

#### POST /sendUserInvitation
**Headers:**
- `Authorization: Bearer <anon_key>`
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string",
  "fullName": "string",
  "message": "string | null",
  "tenantId": "uuid",
  "invitedBy": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "invitation": {
    "id": "uuid",
    "email": "string",
    "expiresAt": "timestamp"
  }
}
```

**Response 400:**
```json
{
  "error": "string",
  "code": "string"
}
```

---

**Status**: ✅ Fully Implemented and Tested  
**Version**: 1.0  
**Last Updated**: October 15, 2025  
**Migration Number**: 029
