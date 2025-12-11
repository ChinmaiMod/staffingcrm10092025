-- Add role_id column to user_invitations table
-- This allows admins to specify a role when inviting users

-- Add role_id column with foreign key to user_roles
ALTER TABLE user_invitations 
ADD COLUMN IF NOT EXISTS role_id integer REFERENCES user_roles(role_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_role_id ON user_invitations(role_id);

-- Add comment
COMMENT ON COLUMN user_invitations.role_id IS 'Optional role to assign to user when they accept the invitation. If NULL, defaults to READ_ONLY role.';
