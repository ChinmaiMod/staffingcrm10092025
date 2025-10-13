import { useCallback, useEffect, useMemo, useState } from 'react'
import InternalStaffForm from './InternalStaffForm'
import { supabase } from '../../../../api/supabaseClient'
import { useTenant } from '../../../../contexts/TenantProvider'
import { useAuth } from '../../../../contexts/AuthProvider'

const SKELETON_ROWS = 6
const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const normalizeStaffRecord = (record) => {
  if (!record) return null

  const identifier = record.staff_id || record.id
  const business = record.businesses || null

  return {
    ...record,
    __identifier: identifier,
    fullName: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
    business_id: record.business_id || '',
    business_name: business?.business_name || null,
    start_date: record.start_date || null,
    end_date: record.end_date || null,
    is_billable: record.is_billable ?? false,
  }
}

const normalizeBusiness = (business) => {
  if (!business) return null
  const id = business.business_id || business.id
  return {
    id,
    name: business.business_name || 'Unnamed Business',
    isDefault: business.is_default || false,
  }
}

export default function InternalStaffPage() {
  const { tenant } = useTenant()
  const { profile } = useAuth()

  const [businesses, setBusinesses] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [formVisible, setFormVisible] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [businessFilter, setBusinessFilter] = useState('ALL')

  const canManageStaff = useMemo(() => {
    if (!profile?.role) return true
    const elevatedRoles = ['ADMIN', 'SUPER_ADMIN', 'CEO']
    return elevatedRoles.includes(profile.role)
  }, [profile?.role])

  const businessLookup = useMemo(() => {
    return businesses.reduce((acc, business) => {
      acc[business.id] = business
      return acc
    }, {})
  }, [businesses])

  const loadBusinesses = useCallback(async () => {
    if (!tenant?.tenant_id) {
      setBusinesses([])
      return
    }

    const { data, error: fetchError } = await supabase
      .from('businesses')
      .select('business_id, business_name, is_default')
      .eq('tenant_id', tenant.tenant_id)
      .order('is_default', { ascending: false })
      .order('business_name', { ascending: true })

    if (fetchError) {
      console.error('Failed to load businesses:', fetchError)
      setBusinesses([])
      return
    }

    const mapped = (data || []).map(normalizeBusiness).filter(Boolean)
    setBusinesses(mapped)
  }, [tenant?.tenant_id])

  const loadStaff = useCallback(async () => {
    if (!tenant?.tenant_id) {
      setStaff([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('internal_staff')
        .select('*, businesses ( business_name )')
        .eq('tenant_id', tenant.tenant_id)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })

      if (fetchError) throw fetchError

      const normalized = (data || []).map(normalizeStaffRecord).filter(Boolean)
      setStaff(normalized)
    } catch (fetchError) {
      console.error('Failed to load internal staff:', fetchError)
      setError(fetchError.message || 'Unable to load staff directory.')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [tenant?.tenant_id])

  useEffect(() => {
    loadBusinesses()
  }, [loadBusinesses])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const filteredStaff = useMemo(() => {
    let results = staff

    if (statusFilter !== 'ALL') {
      results = results.filter((member) => member.status === statusFilter)
    }

    if (businessFilter !== 'ALL') {
      results = results.filter((member) => {
        if (!businessFilter) return !member.business_id
        return member.business_id === businessFilter
      })
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      results = results.filter((member) => {
        return (
          member.fullName.toLowerCase().includes(term) ||
          member.email?.toLowerCase().includes(term) ||
          member.job_title?.toLowerCase().includes(term) ||
          member.department?.toLowerCase().includes(term)
        )
      })
    }

    return results
  }, [staff, statusFilter, businessFilter, searchTerm])

  const resetFormState = () => {
    setFormVisible(false)
    setEditingStaff(null)
    setSubmitting(false)
    setError('')
  }

  const handleCreateClick = () => {
    setEditingStaff(null)
    setFormVisible(true)
  }

  const handleEditClick = (member) => {
    setEditingStaff(member)
    setFormVisible(true)
  }

  const handleDeleteClick = async (member) => {
    if (!canManageStaff) return
    const confirmMessage = `Remove ${member.fullName || 'this team member'} from internal staff?`
    if (!window.confirm(confirmMessage)) return

    try {
      const { error: deleteError } = await supabase
        .from('internal_staff')
        .delete()
        .eq('staff_id', member.__identifier)

      if (deleteError) throw deleteError
      await loadStaff()
    } catch (deleteError) {
      console.error('Failed to delete internal staff member:', deleteError)
      setError(deleteError.message || 'Unable to delete staff member.')
    }
  }

  const handleFormSubmit = async (formValues) => {
    if (!tenant?.tenant_id) return
    if (!canManageStaff) return

    setSubmitting(true)
    setError('')

    const timestamp = new Date().toISOString()
    const payload = {
      ...formValues,
      tenant_id: tenant.tenant_id,
      updated_at: timestamp,
      updated_by: profile?.id || null,
    }

    if (!editingStaff) {
      payload.created_at = timestamp
      payload.created_by = profile?.id || null
    }

    try {
      if (editingStaff) {
        const { error: updateError } = await supabase
          .from('internal_staff')
          .update(payload)
          .eq('staff_id', editingStaff.__identifier)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('internal_staff')
          .insert([payload])

        if (insertError) throw insertError
      }

      await loadStaff()
      resetFormState()
    } catch (submitError) {
      console.error('Failed to save internal staff member:', submitError)
      setError(submitError.message || 'Unable to save staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderEmptyState = () => (
    <div className="crm-empty-state">
      <div className="empty-state-icon">👥</div>
      <h3>No internal staff yet</h3>
      <p>Add recruiters, leads, and other internal team members so you can assign work and track resources.</p>
      {canManageStaff && (
        <button className="btn btn-primary" onClick={handleCreateClick}>
          + Add Team Member
        </button>
      )}
    </div>
  )

  return (
    <div className="crm-page">
      <div className="crm-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>Internal Staff</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Manage team members across businesses for tenant <strong>{tenant?.company_name || tenant?.tenant_id || '—'}</strong>
          </p>
        </div>
        {canManageStaff && (
          <button className="btn btn-primary" onClick={handleCreateClick}>
            + Add Team Member
          </button>
        )}
      </div>

      <div className="crm-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="search"
            placeholder="Search by name, email, job title, or department"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ flex: '1 1 280px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={businessFilter}
            onChange={(event) => setBusinessFilter(event.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="ALL">All businesses</option>
            <option value="">Global / Not assigned</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {formVisible && (
        <InternalStaffForm
          initialValues={editingStaff}
          businesses={businesses}
          onSubmit={handleFormSubmit}
          onCancel={resetFormState}
          submitting={submitting}
        />
      )}

      {loading ? (
        <div className="crm-card">
          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Job Title</th>
                  <th>Dates</th>
                  <th style={{ width: '160px' }}>Billable</th>
                  {canManageStaff && <th style={{ width: '140px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={canManageStaff ? 8 : 7}>
                      <div className="skeleton" style={{ height: '20px', margin: '6px 0' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="crm-card">
          <div className="table-responsive">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Business</th>
                  <th>Status</th>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Dates</th>
                  <th>Billable</th>
                  {canManageStaff && <th style={{ width: '140px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => {
                  const business = member.business_id ? businessLookup[member.business_id] : null
                  const businessName = business?.name || member.business_name || '—'
                  const formattedStart = member.start_date ? new Date(member.start_date).toLocaleDateString() : '—'
                  const formattedEnd = member.end_date ? new Date(member.end_date).toLocaleDateString() : '—'

                  return (
                    <tr key={member.__identifier}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{member.fullName || '—'}</div>
                        {member.phone && (
                          <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{member.phone}</div>
                        )}
                      </td>
                      <td>
                        <a href={`mailto:${member.email}`} style={{ color: '#2563eb' }}>{member.email}</a>
                      </td>
                      <td>{businessName}</td>
                      <td>
                        <span className={`status-badge ${member.status === 'ACTIVE' ? 'initial-contact' : member.status === 'ON_LEAVE' ? 'qualified' : ''}`}>
                          {member.status === 'ACTIVE' ? 'Active' : member.status === 'ON_LEAVE' ? 'On Leave' : 'Inactive'}
                        </span>
                      </td>
                      <td>{member.job_title || '—'}</td>
                      <td>{member.department || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span><strong>Start:</strong> {formattedStart}</span>
                          <span><strong>End:</strong> {formattedEnd}</span>
                        </div>
                      </td>
                      <td>{member.is_billable ? 'Yes' : 'No'}</td>
                      {canManageStaff && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary" onClick={() => handleEditClick(member)}>
                              Edit
                            </button>
                            <button className="btn btn-danger" onClick={() => handleDeleteClick(member)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
