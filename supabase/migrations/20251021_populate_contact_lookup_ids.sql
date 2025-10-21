-- Migration: Populate ID columns in contacts table from lookup tables
-- Visa Status
UPDATE contacts SET visa_status_id = vs.id
FROM visa_statuses vs
WHERE contacts.visa_status = vs.visa_status;

-- Job Title
UPDATE contacts SET job_title_id = jt.id
FROM job_titles jt
WHERE contacts.job_title = jt.job_title;

-- Type of Roles
UPDATE contacts SET type_of_roles_id = tr.id
FROM type_of_roles tr
WHERE contacts.role_types = tr.type_of_roles;

-- Country
UPDATE contacts SET country_id = c.country_id
FROM countries c
WHERE contacts.country = c.name;

-- State
UPDATE contacts SET state_id = s.state_id
FROM states s
WHERE contacts.state = s.name;

-- City
UPDATE contacts SET city_id = ci.city_id
FROM cities ci
WHERE contacts.city = ci.name;

-- Years of Experience
UPDATE contacts SET years_of_experience_id = ye.id
FROM years_of_experience ye
WHERE contacts.years_experience = ye.years_of_experience;

-- Referral Source
UPDATE contacts SET referral_source_id = rs.id
FROM referral_sources rs
WHERE contacts.referral_source = rs.referral_source;
