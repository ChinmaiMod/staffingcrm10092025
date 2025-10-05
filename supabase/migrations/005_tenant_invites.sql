-- Migration: tenant_invites table
-- Stores one-time invite tokens created by Tenant Admins

CREATE TABLE IF NOT EXISTS tenant_invites (
  invite_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text DEFAULT 'USER' CHECK (role IN ('ADMIN','USER')),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','EXPIRED','REVOKED')),
  expires_at timestamptz,
  created_by uuid, -- profiles.id of inviter
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON tenant_invites(lower(email));
