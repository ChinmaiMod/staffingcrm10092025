-- Add optional refered_by metadata to referral_sources for non-social referrals
alter table public.referral_sources
  add column if not exists refered_by text;
