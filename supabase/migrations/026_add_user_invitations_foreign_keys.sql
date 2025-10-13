-- Add foreign key constraints for user_invitations invited_by and revoked_by fields

-- Add foreign key for invited_by
ALTER TABLE user_invitations
  ADD CONSTRAINT user_invitations_invited_by_fkey 
  FOREIGN KEY (invited_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

-- Add foreign key for revoked_by
ALTER TABLE user_invitations
  ADD CONSTRAINT user_invitations_revoked_by_fkey 
  FOREIGN KEY (revoked_by) 
  REFERENCES profiles(id) 
  ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_revoked_by ON user_invitations(revoked_by);
