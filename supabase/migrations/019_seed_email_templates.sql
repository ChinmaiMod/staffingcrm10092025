-- Migration: Seed default email templates
-- Created: 2025-10-14

-- Note: This migration inserts sample templates for ALL tenants
-- Templates will be created for each existing tenant with created_by as NULL (system-generated)

DO $$
DECLARE
  tenant_rec RECORD;
BEGIN
  FOR tenant_rec IN SELECT tenant_id FROM tenants LOOP
    -- Insert sample templates for this tenant
    INSERT INTO email_templates (tenant_id, name, subject, body_text, body_html, created_by)
    VALUES
      -- Welcome Email
      (
        tenant_rec.tenant_id,
        'Welcome Email',
        'Welcome to Our Services, {first_name}!',
        E'Dear {first_name} {last_name},\n\nWelcome to our staffing services! We are excited to have you on board.\n\nWe will keep you updated on opportunities that match your profile and skills. If you have any questions, feel free to reach out to us.\n\nBest regards,\n{business_name} Team',
        '<p>Dear {first_name} {last_name},</p><p>Welcome to our staffing services! We are excited to have you on board.</p><p>We will keep you updated on opportunities that match your profile and skills. If you have any questions, feel free to reach out to us.</p><p>Best regards,<br>{business_name} Team</p>',
        NULL
      ),
      
      -- Interview Reminder
      (
        tenant_rec.tenant_id,
        'Interview Reminder',
        'Interview Reminder - {first_name}',
        E'Hi {first_name},\n\nThis is a friendly reminder about your upcoming interview with {business_name}.\n\nPlease make sure you are prepared and arrive on time. If you have any questions or need to reschedule, please contact us as soon as possible.\n\nContact: {phone}\n\nGood luck!\n\nBest regards,\n{business_name} Team',
        '<p>Hi {first_name},</p><p>This is a friendly reminder about your upcoming interview with {business_name}.</p><p>Please make sure you are prepared and arrive on time. If you have any questions or need to reschedule, please contact us as soon as possible.</p><p>Contact: {phone}</p><p>Good luck!</p><p>Best regards,<br>{business_name} Team</p>',
        NULL
      ),
      
      -- Follow-up Contact
      (
        tenant_rec.tenant_id,
        'Follow-up Email',
        'Following Up - {first_name}',
        E'Hello {first_name},\n\nWe wanted to follow up with you regarding your application with {business_name}.\n\nYour current status: {status}\n\nWe will continue to keep you informed of any updates. Please don''t hesitate to reach out if you have any questions.\n\nBest regards,\n{business_name} Team\nEmail: {email}\nPhone: {phone}',
        '<p>Hello {first_name},</p><p>We wanted to follow up with you regarding your application with {business_name}.</p><p>Your current status: <strong>{status}</strong></p><p>We will continue to keep you informed of any updates. Please don''t hesitate to reach out if you have any questions.</p><p>Best regards,<br>{business_name} Team<br>Email: {email}<br>Phone: {phone}</p>',
        NULL
      ),
      
      -- Status Update
      (
        tenant_rec.tenant_id,
        'Status Update Notification',
        'Status Update: {status}',
        E'Hi {first_name} {last_name},\n\nYour application status with {business_name} has been updated.\n\nNew Status: {status}\n\nWe appreciate your patience and will keep you updated on any further developments.\n\nIf you have any questions, please contact us at {phone} or {email}.\n\nBest regards,\n{business_name} Team',
        '<p>Hi {first_name} {last_name},</p><p>Your application status with {business_name} has been updated.</p><p><strong>New Status:</strong> {status}</p><p>We appreciate your patience and will keep you updated on any further developments.</p><p>If you have any questions, please contact us at {phone} or {email}.</p><p>Best regards,<br>{business_name} Team</p>',
        NULL
      ),
      
      -- General Announcement
      (
        tenant_rec.tenant_id,
        'General Announcement',
        'Important Update from {business_name}',
        E'Dear {first_name},\n\nWe have an important update to share with you from {business_name}.\n\n[Insert your announcement details here]\n\nThank you for your attention.\n\nBest regards,\n{business_name} Team\nContact: {phone}\nEmail: {email}',
        '<p>Dear {first_name},</p><p>We have an important update to share with you from {business_name}.</p><p>[Insert your announcement details here]</p><p>Thank you for your attention.</p><p>Best regards,<br>{business_name} Team<br>Contact: {phone}<br>Email: {email}</p>',
        NULL
      );
    
    RAISE NOTICE 'Created 5 sample email templates for tenant: %', tenant_rec.tenant_id;
  END LOOP;
END $$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE email_templates IS 'Reusable email templates with placeholder support. Sample templates created for all tenants.';

