-- ============================================
-- Add email_domain column to tenants table
-- Ensures one tenant per email domain
-- ============================================

-- Add email_domain column to tenants
ALTER TABLE tenants 
ADD COLUMN email_domain TEXT;

-- Add unique constraint to ensure only one tenant per domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_email_domain_unique 
ON tenants(LOWER(email_domain));

-- Add regular index for lookups
CREATE INDEX IF NOT EXISTS idx_tenants_email_domain 
ON tenants(email_domain);

-- Add comment
COMMENT ON COLUMN tenants.email_domain IS 'Email domain of the first registered user (e.g., company.com). Enforces one tenant per domain.';

-- Add check constraint to ensure valid domain format (no @ symbol)
ALTER TABLE tenants 
ADD CONSTRAINT chk_email_domain_format 
CHECK (email_domain IS NULL OR (email_domain NOT LIKE '%@%' AND LENGTH(email_domain) > 2));
