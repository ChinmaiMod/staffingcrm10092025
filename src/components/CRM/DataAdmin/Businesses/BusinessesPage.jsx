import { useCallback, useEffect, useMemo, useState } from 'react'
import BusinessForm from './BusinessForm'
import { supabase } from '../../../../api/supabaseClient'
import { useTenant } from '../../../../contexts/TenantProvider'
import { useAuth } from '../../../../contexts/AuthProvider'

const BUSINESSES_SKELETON_ROWS = 4

const normalizeBusiness = (business) => {
  const identifier = business.business_id || business.id
  const idColumn = business.business_id ? 'business_id' : 'id'
  return {
    ...business,
    __identifier: identifier,
    __idColumn: idColumn,
    enabled_contact_types: Array.isArray(business.enabled_contact_types)
      ? business.enabled_contact_types
      : business.enabled_contact_types?.replace(/[{}]/g, '').split(',').map((item) => item.trim()).filter(Boolean) || [],
    is_active: business.is_active ?? true,
    is_default: business.is_default ?? false
  }
}

export default function BusinessesPage() {
  const { tenant } = useTenant()
  const { profile } = useAuth()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [formVisible, setFormVisible] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const canManageBusinesses = useMemo(() => {
    if (!profile?.role) return true
    const elevatedRoles = ['ADMIN', 'SUPER_ADMIN', 'CEO']
    return elevatedRoles.includes(profile.role)
  }, [profile?.role])

  const fetchBusinesses = useCallback(async () => {
    if (!tenant?.tenant_id) return
    setLoading(true)
    setError('')
    try {
      const { data, error: supabaseError } = await supabase
        .from('businesses')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('is_default', { ascending: false })
        .order('business_name', { ascending: true })

      if (supabaseError) throw supabaseError

      const normalized = (data || []).map(normalizeBusiness)
      setBusinesses(normalized)
    } catch (fetchError) {
  console.error('Error fetching businesses:', fetchError)
      setError(fetchError.message || 'Unable to load businesses')
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [tenant?.tenant_id])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const resetForm = () => {
    setFormVisible(false)
    setEditingBusiness(null)
    setFormSubmitting(false)
    setError('')
  }

  const handleCreateClick = () => {
    setEditingBusiness(null)
    setFormVisible(true)
  }

  const handleEditClick = (business) => {
    setEditingBusiness(business)
    setFormVisible(true)
  }

  const handleDeleteClick = async (business) => {
    if (!canManageBusinesses) return
    const confirmMessage = `Delete business "${business.business_name}"? This action cannot be undone.`
    if (!window.confirm(confirmMessage)) return

    try {
      const identifierColumn = business.__idColumn || 'business_id'
      const { error: supabaseError } = await supabase
        .from('businesses')
        .delete()
        .eq(identifierColumn, business.__identifier)

      if (supabaseError) throw supabaseError
      await fetchBusinesses()
    } catch (deleteError) {
  console.error('Failed to delete business:', deleteError)
      setError(deleteError.message || 'Unable to delete business')
    }
  }

  const handleFormSubmit = async (formValues) => {
    if (!tenant?.tenant_id) return
    if (!canManageBusinesses) return

    setFormSubmitting(true)
    setError('')

    const payload = {
      ...formValues,
      tenant_id: tenant.tenant_id,
      enabled_contact_types: formValues.enabled_contact_types,
      updated_at: new Date().toISOString()
    }

    if (!editingBusiness) {
      payload.created_at = new Date().toISOString()
    }

    try {
      if (editingBusiness) {
        const identifierColumn = editingBusiness.__idColumn || 'business_id'
        const { error: updateError } = await supabase
          .from('businesses')
          .update(payload)
          .eq(identifierColumn, editingBusiness.__identifier)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('businesses')
          .insert([payload])

        if (insertError) throw insertError
      }

      await fetchBusinesses()
      resetForm()
    } catch (submitError) {
  console.error('Failed to save business:', submitError)
      setError(submitError.message || 'Unable to save business')
    } finally {
      setFormSubmitting(false)
    }
  }

  const filteredBusinesses = useMemo(() => {
    let results = businesses

    if (statusFilter !== 'ALL') {
      const activeStatus = statusFilter === 'ACTIVE'
      results = results.filter((biz) => biz.is_active === activeStatus)
    }

    if (typeFilter !== 'ALL') {
      results = results.filter((biz) => biz.business_type === typeFilter)
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      results = results.filter(
        (biz) =>
          biz.business_name?.toLowerCase().includes(search) ||
          biz.description?.toLowerCase().includes(search) ||
          biz.industry?.toLowerCase().includes(search)
      )
    }

    return results
  }, [businesses, statusFilter, typeFilter, searchTerm])

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">🏢</div>
      <h3>No Businesses Found</h3>
      <p>Create your first business to segment contacts, pipelines, and lookup data.</p>
      {canManageBusinesses && (
        <button className="btn btn-primary" onClick={handleCreateClick}>
          + Add Business
        </button>
      )}
    </div>
  )

  return (
    <div className="data-table-container">
      <div className="table-header">
        <div>
          <h2>🏢 Businesses</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Manage business entities for <strong>{tenant?.company_name || tenant?.tenant_id || 'your tenant'}</strong>
          </p>
        </div>
        {canManageBusinesses && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleCreateClick}>
              + Add Business
            </button>
          </div>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '180px' }}
        >
          <option value="ALL">All Types</option>
          <option value="IT_STAFFING">IT Staffing</option>
          <option value="HEALTHCARE_STAFFING">Healthcare Staffing</option>
          <option value="GENERAL">General</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {formVisible && (
        <BusinessForm
          initialValues={editingBusiness}
          onSubmit={handleFormSubmit}
          onCancel={resetForm}
          submitting={formSubmitting}
        />
      )}

      {loading ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Status</th>
              <th>Updated</th>
              {canManageBusinesses && <th style={{ width: '160px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: BUSINESSES_SKELETON_ROWS }).map((_, index) => (
              <tr key={index}>
                <td colSpan={canManageBusinesses ? 6 : 5}>
                  <div className="skeleton" style={{ height: '20px', margin: '6px 0' }}></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : businesses.length === 0 ? (
        renderEmptyState()
      ) : filteredBusinesses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No Matching Businesses</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Updated</th>
              {canManageBusinesses && <th style={{ width: '180px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredBusinesses.map((business) => (
              <tr key={business.__identifier}>
                <td>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {business.business_name}
                    {business.is_default && (
                      <span className="status-badge" style={{ background: '#ede9fe', color: '#5b21b6', fontSize: '11px', padding: '3px 8px' }}>
                        ★ Default
                      </span>
                    )}
                  </div>
                  {business.description && (
                    <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px', lineHeight: '1.4' }}>
                      {business.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {business.business_type?.replace(/_/g, ' ') || '—'}
                  </span>
                </td>
                <td>{business.industry || '—'}</td>
                <td>
                  <span
                    className={`status-badge ${business.is_active ? 'initial-contact' : ''}`}
                    style={business.is_active ? { background: '#d1fae5', color: '#065f46' } : { background: '#fee2e2', color: '#991b1b' }}
                  >
                    {business.is_active ? '● Active' : '● Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: '#64748b' }}>
                  {business.updated_at ? new Date(business.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                {canManageBusinesses && (
                  <td>
                    <div className="action-buttons" style={{ gap: '6px' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleEditClick(business)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteClick(business)}
                        disabled={business.is_default}
                        title={business.is_default ? 'Default business cannot be deleted' : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
