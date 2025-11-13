-- ============================================
-- Add Recruiter Tracking to Contacts
-- Links contacts to internal_staff members for recruiter attribution
-- ============================================

-- Add recruiter_id column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS recruiter_id uuid REFERENCES internal_staff(staff_id) ON DELETE SET NULL;

COMMENT ON COLUMN contacts.recruiter_id IS 'Internal staff member (recruiter) who submitted/created this contact';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_recruiter_id ON contacts(recruiter_id);

-- ============================================
-- Add Revenue Tracking to Job Orders
-- ============================================

-- Add actual_revenue column to track revenue generated from filled positions
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS actual_revenue numeric(12, 2);

COMMENT ON COLUMN job_orders.actual_revenue IS 'Actual revenue generated from this job order (calculated from placements)';

-- ============================================
-- END OF MIGRATION
-- ============================================
