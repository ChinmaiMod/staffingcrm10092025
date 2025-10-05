-- Update existing profile status from PENDING to ACTIVE
UPDATE profiles 
SET status = 'ACTIVE' 
WHERE email = 'pavan@intuites.com' AND status = 'PENDING';
