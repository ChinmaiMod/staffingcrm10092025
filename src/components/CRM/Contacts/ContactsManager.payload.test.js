import { describe, it, expect } from 'vitest'
import { buildContactUpsertPayload } from './ContactsManager.jsx'

describe('buildContactUpsertPayload', () => {
  it('includes non-status fields when status changes', () => {
    const { updatePayload } = buildContactUpsertPayload({
      tenantId: 'tenant-123',
      businessId: null,
      profileId: 'user-1',
      nowIso: '2026-01-05T00:00:00.000Z',
      contactData: {
        first_name: 'Johnny',
        last_name: 'Doe',
        email: 'johnny.doe@intuites.com',
        phone: '+1 (555) 000-0000',
        contact_type: 'IT Candidate',
        workflow_status_id: 32,
        statusChanged: true,
        statusChangeRemarks: 'optional',
      },
    })

    expect(updatePayload.first_name).toBe('Johnny')
    expect(updatePayload.phone).toBe('+1 (555) 000-0000')
    expect(updatePayload.workflow_status_id).toBe(32)
    expect(updatePayload.tenant_id).toBe('tenant-123')
    expect(updatePayload.business_id).toBe(null)
    expect(updatePayload.updated_by).toBe('user-1')
    expect(updatePayload.updated_at).toBe('2026-01-05T00:00:00.000Z')
  })
})