import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sendBulkEmail } from '../../../api/edgeFunctions'
import { useAuth } from '../../../contexts/AuthProvider'
import { useTenant } from '../../../contexts/TenantProvider'
import { supabase } from '../../../api/supabaseClient'
import { applyAdvancedFilters, describeFilter, isFilterEmpty } from '../../../utils/filterEngine'
import { logger } from '../../../utils/logger'
import { createUniqueFileName } from '../../../utils/fileUtils'
import ContactForm from './ContactForm'
import ContactDetail from './ContactDetail'
import AdvancedFilterBuilder from './AdvancedFilterBuilder'

const CONTACT_TYPE_LABELS = {
  it_candidate: 'IT Candidate',
  healthcare_candidate: 'Healthcare Candidate',
  vendor_client: 'Vendor Client',
  empanelment_contact: 'Vendor Empanelment',
  internal_india: 'Employee (India)',
  internal_usa: 'Employee (USA)'
}

const CONTACT_TYPE_LABEL_TO_KEY = (() => {
  const lookup = {
    'vendor/client contact': 'vendor_client',
    'vendor client': 'vendor_client',
    'vendor_empanelment': 'empanelment_contact',
    'vendor empanelment': 'empanelment_contact',
    'internal hire (india)': 'internal_india',
    'internal hire (usa)': 'internal_usa'
  }

  Object.entries(CONTACT_TYPE_LABELS).forEach(([key, label]) => {
    const normalizedLabel = label.toLowerCase()
    lookup[normalizedLabel] = key
    lookup[key.toLowerCase()] = key
    lookup[normalizedLabel.replace(/[^a-z0-9]+/g, '_')] = key
  })

  return lookup
})()

const mapContactTypeToDb = (key) => {
  if (!key) return null
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return CONTACT_TYPE_LABELS[normalizedKey] || CONTACT_TYPE_LABELS[key] || key
}

const mapContactTypeToKey = (value) => {
  if (!value) return null
  const normalized = value.toLowerCase()
  const sanitized = normalized.replace(/[^a-z0-9]+/g, '_')
  return (
    CONTACT_TYPE_LABEL_TO_KEY[normalized] ||
    CONTACT_TYPE_LABEL_TO_KEY[sanitized] ||
    sanitized
  )
}

const nullIfEmpty = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

const normalizeStringArray = (value) => {
  if (!value) return null
  const arrayValue = Array.isArray(value) ? value : [value]
  const cleaned = arrayValue
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean)
  return cleaned.length > 0 ? cleaned : null
}

export default function ContactsManager() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { session, profile } = useAuth()
  const { tenant } = useTenant()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterTimeframe, setFilterTimeframe] = useState('all')
  const [filterBusiness, setFilterBusiness] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState([])
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [bulkEmailData, setBulkEmailData] = useState({ subject: '', body: '' })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [defaultBusinessId, setDefaultBusinessId] = useState(null)
  const [businesses, setBusinesses] = useState([])
  
  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilterConfig, setAdvancedFilterConfig] = useState(null)
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false)

  // Bug #13 fix: Add refs for cleanup to prevent memory leaks
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef(null)

  const loadContacts = useCallback(async () => {
    // Bug #13 fix: Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Bug #13 fix: Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      if (!tenant?.tenant_id) {
        logger.warn('No tenant available, skipping contact load')
        setContacts([])
        setLoading(false)
        return
      }

      const { data, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          id,
          tenant_id,
          business_id,
          first_name,
          last_name,
          email,
          phone,
          contact_type,
          created_at,
          updated_at,
          remarks,
          visa_status,
          job_title,
          reason_for_contact,
          workflow_status,
          type_of_roles,
          country,
          state,
          city,
          years_of_experience,
          referral_source,
          referred_by,
          businesses:business_id ( business_id, business_name )
        `)
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: false })
        .abortSignal(abortControllerRef.current.signal)

      if (contactsError) {
        throw contactsError
      }

      const normalizedContacts = (data || []).map((contact) => {
        const contactTypeKey = mapContactTypeToKey(contact.contact_type)
        const contactTypeLabel = CONTACT_TYPE_LABELS[contactTypeKey] || contact.contact_type || null

        const reasons = Array.isArray(contact.reason_for_contact)
          ? contact.reason_for_contact.filter(Boolean)
          : contact.reason_for_contact
          ? [contact.reason_for_contact]
          : []

        const roleTypes = Array.isArray(contact.type_of_roles)
          ? contact.type_of_roles.filter(Boolean)
          : contact.type_of_roles
          ? [contact.type_of_roles]
          : []

        return {
          contact_id: contact.id,
          business_id: contact.business_id || null,
          business_name: contact.businesses?.business_name || null,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          contact_type: contactTypeLabel,
          contact_type_key: contactTypeKey,
          status: contact.workflow_status || 'Unknown',
          status_code: contact.workflow_status || null,
          visa_status: contact.visa_status || null,
          visa_status_code: contact.visa_status || null,
          job_title: contact.job_title || null,
          job_title_category:
            contactTypeKey === 'healthcare_candidate'
              ? 'HEALTHCARE'
              : contactTypeKey === 'it_candidate'
              ? 'IT'
              : null,
          years_experience: contact.years_of_experience || null,
          years_experience_code: contact.years_of_experience || null,
          referral_source: contact.referral_source || null,
          referral_source_code: contact.referral_source || null,
          reasons_for_contact: reasons,
          role_types: roleTypes,
          remarks: contact.remarks,
          country: contact.country || null,
          country_code: contact.country || null,
          state: contact.state || null,
          state_code: contact.state || null,
          city: contact.city || null,
          referred_by: contact.referred_by || null,
          created_at: contact.created_at,
          updated_at: contact.updated_at
        }
      })

      setContacts(normalizedContacts)
      setLoading(false)
    } catch (err) {
      // Bug #13 fix: Ignore abort errors, only handle real errors
      if (err.name === 'AbortError') {
        logger.log('loadContacts request was aborted')
        return
      }

      logger.error('Error loading contacts:', err)
      setError(err.message || 'Failed to load contacts')
      setContacts([])
      setLoading(false)
    }
  }, [tenant?.tenant_id])

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setDefaultBusinessId(null)
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    const fetchDefaultBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('business_id, is_default')
          .eq('tenant_id', tenant.tenant_id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .abortSignal(controller.signal)

        if (error) {
          throw error
        }

        if (!isCancelled) {
          setDefaultBusinessId(data?.[0]?.business_id || null)
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        logger.error('Error fetching default business:', err)
        if (!isCancelled) {
          setDefaultBusinessId(null)
        }
      }
    }

    fetchDefaultBusiness()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [tenant?.tenant_id])

  useEffect(() => {
    if (!tenant?.tenant_id) {
      setBusinesses([])
      return
    }

    let isCancelled = false
    const controller = new AbortController()

    const loadBusinesses = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('business_id, business_name, is_default')
          .eq('tenant_id', tenant.tenant_id)
          .order('is_default', { ascending: false })
          .order('business_name', { ascending: true })
          .abortSignal(controller.signal)

        if (error) {
          throw error
        }

        if (!isCancelled) {
          setBusinesses(data || [])
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        logger.error('Error loading businesses for contacts page:', err)
        if (!isCancelled) {
          setBusinesses([])
        }
      }
    }

    loadBusinesses()

    return () => {
      isCancelled = true
      controller.abort()
    }
  }, [tenant?.tenant_id])

  const businessLookup = useMemo(() => {
    return (businesses || []).reduce((acc, biz) => {
      if (!biz?.business_id) return acc
      acc[biz.business_id] = biz.business_name
      return acc
    }, {})
  }, [businesses])

  useEffect(() => {
    // Apply filters from URL parameters
    const statusParam = searchParams.get('status')
    const timeframeParam = searchParams.get('timeframe')
    
    if (statusParam) {
      setFilterStatus(statusParam)
    }
    if (timeframeParam) {
      setFilterTimeframe(timeframeParam)
    }

    // Load contacts once on mount and when search params change
    if (tenant?.tenant_id && profile?.id) {
      loadContacts()
    } else {
      setLoading(false)
    }

    // Bug #13 fix: Cleanup function
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [searchParams, loadContacts, tenant?.tenant_id, profile?.id])

  const handleCreateContact = () => {
    setSelectedContact(null)
    setShowForm(true)
  }

  const handleEditContact = (contact) => {
    const editableContact = {
      ...contact,
      contact_type:
        contact.contact_type_key ||
        mapContactTypeToKey(contact.contact_type) ||
        'it_candidate',
      business_name: contact.business_name || null,
      visa_status: contact.visa_status,
      job_title: contact.job_title,
      years_experience: contact.years_experience,
      referral_source: contact.referral_source,
      reasons_for_contact: contact.reasons_for_contact,
      role_types: contact.role_types,
      country: contact.country,
      state: contact.state,
      city: contact.city,
      business_id: contact.business_id || null
    }

    setSelectedContact(editableContact)
    setShowForm(true)
  }

  const handleViewContact = (contact) => {
    setSelectedContact(contact)
  }

  const handleSaveContact = async (contactData, attachments = []) => {
    if (!tenant?.tenant_id) {
      alert('Missing tenant context. Please refresh and try again.')
      return
    }

    const {
      statusChangeRemarks,
      statusChanged,
      status,
      reasons_for_contact,
      role_types,
      years_experience,
      referral_source,
      ...formFields
    } = contactData

    const businessId = selectedContact?.business_id ?? defaultBusinessId ?? null

    const payload = {
      tenant_id: tenant.tenant_id,
      business_id: businessId,
      first_name: nullIfEmpty(formFields.first_name),
      last_name: nullIfEmpty(formFields.last_name),
      email: nullIfEmpty(formFields.email),
      phone: nullIfEmpty(formFields.phone),
      contact_type: mapContactTypeToDb(formFields.contact_type),
      visa_status: nullIfEmpty(formFields.visa_status),
      job_title: nullIfEmpty(formFields.job_title),
      workflow_status: nullIfEmpty(status),
      reason_for_contact: normalizeStringArray(reasons_for_contact),
      type_of_roles: normalizeStringArray(role_types),
      country: nullIfEmpty(formFields.country),
      state: nullIfEmpty(formFields.state),
      city: nullIfEmpty(formFields.city),
      years_of_experience: nullIfEmpty(years_experience),
      referral_source: nullIfEmpty(referral_source),
      remarks: nullIfEmpty(formFields.remarks),
      referred_by: nullIfEmpty(formFields.referred_by)
    }

    try {
      setSavingContact(true)
      let contactId = selectedContact?.contact_id || null
      let effectiveBusinessId = businessId

      if (selectedContact?.contact_id) {
        const { data, error } = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', selectedContact.contact_id)
          .eq('tenant_id', tenant.tenant_id)
          .select('id, business_id')

        if (error) {
          throw error
        }
        if (data && data.length > 0) {
          contactId = data[0].id
          effectiveBusinessId = data[0].business_id ?? effectiveBusinessId
        }
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert([payload])
          .select('id, business_id')
          .single()

        if (error) {
          throw error
        }
        contactId = data?.id || null
        effectiveBusinessId = data?.business_id ?? effectiveBusinessId
      }

      if (contactId && attachments.length > 0) {
        const storageBucket = supabase.storage.from('contact-attachments')

        for (const attachment of attachments) {
          if (!attachment?.file) continue

          const uniqueName = createUniqueFileName(attachment.name)
          const storagePath = `${tenant.tenant_id}/${contactId}/${uniqueName}`

          const { error: uploadError } = await storageBucket.upload(
            storagePath,
            attachment.file,
            {
              upsert: false,
              contentType: attachment.file.type || 'application/octet-stream'
            }
          )

          if (uploadError) {
            throw uploadError
          }

          const { error: metadataError } = await supabase
            .from('contact_attachments')
            .insert({
              contact_id: contactId,
              tenant_id: tenant.tenant_id,
              business_id: effectiveBusinessId,
              file_name: attachment.name,
              file_path: storagePath,
              content_type: attachment.file.type || null,
              size_bytes: attachment.size || null,
              description: nullIfEmpty(attachment.description),
              uploaded_by: profile?.id || null
            })

          if (metadataError) {
            throw metadataError
          }
        }

        attachments.forEach((attachment) => {
          if (attachment?.preview) {
            URL.revokeObjectURL(attachment.preview)
          }
        })
      }

      if (contactId && statusChanged && statusChangeRemarks) {
        const { error: statusHistoryError } = await supabase
          .from('contact_status_history')
          .insert({
            contact_id: contactId,
            old_status: selectedContact?.status || null,
            new_status: status,
            notes: statusChangeRemarks,
            changed_by: profile?.id || null
          })

        if (statusHistoryError) {
          throw statusHistoryError
        }
      }

      setShowForm(false)
      setSelectedContact(null)
      await loadContacts()
    } catch (err) {
      logger.error('Error saving contact:', err)
      alert('Error saving contact: ' + (err.message || 'Unknown error'))
    } finally {
      setSavingContact(false)
    }
  }

  const handleDeleteContact = async (contactId) => {
    if (!tenant?.tenant_id) {
      alert('Missing tenant context. Please refresh and try again.')
      return
    }

    if (!confirm('Are you sure you want to delete this contact?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('tenant_id', tenant.tenant_id)

      if (error) {
        throw error
      }

      if (selectedContact?.contact_id === contactId) {
        setSelectedContact(null)
      }

      await loadContacts()
    } catch (err) {
      logger.error('Error deleting contact:', err)
      alert('Error deleting contact: ' + (err.message || 'Failed to delete contact'))
    }
  }

  const handleSelectContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === finalContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(finalContacts.map(c => c.contact_id))
    }
  }

  const handleBulkEmail = () => {
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact')
      return
    }
    setShowBulkEmailModal(true)
  }

  const handleSendBulkEmail = async () => {
    if (!bulkEmailData.subject || !bulkEmailData.body) {
      alert('Please fill in subject and body')
      return
    }

    try {
      setSendingEmail(true)
      const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.contact_id))
      
      // Prepare recipients for Resend API
      const recipients = selectedContactsData.map(c => ({
        email: c.email,
        name: `${c.first_name} ${c.last_name}`
      }))
      
      // Call edge function to send emails via Resend API
      const result = await sendBulkEmail(
        recipients,
        bulkEmailData.subject,
        bulkEmailData.body,
        session?.access_token
      )
      
      logger.log('Bulk email result:', result)
      
      alert(`Email sent successfully to ${result.successful} of ${result.total} contact(s)!`)
      setShowBulkEmailModal(false)
      setBulkEmailData({ subject: '', body: '' })
      setSelectedContacts([])
    } catch (err) {
      logger.error('Bulk email error:', err)
      alert('Error sending email: ' + err.message)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleApplyAdvancedFilters = (filterConfig) => {
    setAdvancedFilterConfig(filterConfig)
    setIsAdvancedFilterActive(!isFilterEmpty(filterConfig))
    setShowAdvancedFilter(false)
    setSelectedContacts([]) // Clear selections when filter changes
  }

  const handleClearAdvancedFilters = () => {
    setAdvancedFilterConfig(null)
    setIsAdvancedFilterActive(false)
  }

  // Defensive programming: ensure contacts is always an array (Bug #9 fix)
  const filteredContacts = (contacts || []).filter(contact => {
    // Basic search - use null coalescing for safety
    const firstName = (contact.first_name || '').toLowerCase()
    const lastName = (contact.last_name || '').toLowerCase()
    const email = (contact.email || '').toLowerCase()
    const searchTermLower = searchTerm.toLowerCase()
    
    const matchesSearch = 
      firstName.includes(searchTermLower) ||
      lastName.includes(searchTermLower) ||
      email.includes(searchTermLower)
    
    // Basic filters
    const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
    const matchesType = filterType === 'all' || contact.contact_type_key === filterType
    const matchesBusiness =
      filterBusiness === 'all' ||
      (filterBusiness === 'global' && !contact.business_id) ||
      contact.business_id === filterBusiness
    
    // Timeframe filter (mock implementation - in production, filter by created_at date)
    let matchesTimeframe = true
    if (filterTimeframe !== 'all') {
      const createdAt = contact.created_at ? new Date(contact.created_at) : null
      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        matchesTimeframe = false
      } else {
        const now = new Date()
        const diffMs = now.getTime() - createdAt.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (filterTimeframe === 'week') {
          matchesTimeframe = diffDays <= 7
        } else if (filterTimeframe === 'month') {
          matchesTimeframe = diffDays <= 30
        }
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesTimeframe && matchesBusiness
  })

  // Apply advanced filters if active
  const finalContacts = isAdvancedFilterActive 
    ? applyAdvancedFilters(filteredContacts, advancedFilterConfig)
    : filteredContacts

  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('all')
    setFilterType('all')
    setFilterTimeframe('all')
    setFilterBusiness('all')
    setSearchParams({}) // Clear URL parameters
    handleClearAdvancedFilters() // Clear advanced filters
  }

  const hasActiveFilters =
    searchTerm ||
    filterStatus !== 'all' ||
    filterType !== 'all' ||
    filterTimeframe !== 'all' ||
    filterBusiness !== 'all' ||
    isAdvancedFilterActive

  if (loading) {
    return <div className="loading">Loading contacts...</div>
  }

  if (selectedContact && !showForm) {
    return (
      <ContactDetail
        contact={{
          ...selectedContact,
          business_name:
            selectedContact.business_name ||
            (selectedContact.business_id ? businessLookup[selectedContact.business_id] : null)
        }}
        onClose={() => setSelectedContact(null)}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
      />
    )
  }

  return (
    <div>
      <div className="crm-header">
        <h1>Contacts Management</h1>
        <div className="crm-header-actions">
          {hasActiveFilters && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#dbeafe', 
              borderRadius: '8px', 
              fontSize: '14px',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔍 Filters Active
              {filterStatus !== 'all' && <span>• Status: {filterStatus}</span>}
              {filterTimeframe !== 'all' && (
                <span>• {filterTimeframe === 'week' ? 'This Week' : 'This Month'}</span>
              )}
              {filterBusiness !== 'all' && (
                <span>
                  • Business:{' '}
                  {businessLookup[filterBusiness] || 'Global'}
                </span>
              )}
            </div>
          )}
          <button className="btn btn-primary" onClick={handleCreateContact}>
            + New Contact
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px' }}>
          Error: {error}
        </div>
      )}

      <div className="data-table-container">
        <div className="filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="all">All Types</option>
            <option value="it_candidate">IT Candidate</option>
            <option value="healthcare_candidate">Healthcare Candidate</option>
            <option value="vendor_client">Vendor/Client</option>
            <option value="empanelment_contact">Vendor Empanelment</option>
            <option value="internal_india">Employee (India)</option>
            <option value="internal_usa">Employee (USA)</option>
          </select>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="all">All Statuses</option>
            <option value="Initial Contact">Initial Contact</option>
            <option value="Spoke to candidate">Spoke to candidate</option>
            <option value="Resume needs to be prepared">Resume needs prep</option>
            <option value="Resume prepared and sent for review">Resume prepared</option>
            <option value="Assigned to Recruiter">Assigned to Recruiter</option>
            <option value="Recruiter started marketing">Marketing</option>
            <option value="Placed into Job">Placed</option>
          </select>
          <select 
            value={filterTimeframe}
            onChange={(e) => setFilterTimeframe(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select
            value={filterBusiness}
            onChange={(e) => setFilterBusiness(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '180px' }}
          >
            <option value="all">All Businesses</option>
            <option value="global">Global (Unassigned)</option>
            {businesses.map((biz) => (
              <option key={biz.business_id} value={biz.business_id}>
                {biz.business_name}
              </option>
            ))}
          </select>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAdvancedFilter(true)}
            title="Advanced filtering with AND/OR conditions"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              fontWeight: '500'
            }}
          >
            🔍 Advanced Filter
          </button>
          {hasActiveFilters && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
              title="Clear all filters"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {isAdvancedFilterActive && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            border: '2px solid #667eea',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ color: '#667eea', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', marginRight: '8px' }}>
                Active Filter:
              </span>
              <span style={{ color: '#4a5568', fontSize: '14px' }}>
                {describeFilter(advancedFilterConfig)}
              </span>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleClearAdvancedFilters}
              style={{ fontSize: '12px' }}
            >
              ✕ Clear Advanced Filter
            </button>
          </div>
        )}

        {selectedContacts.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#dbeafe',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: '#1e40af', fontWeight: '500' }}>
              {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleBulkEmail}
              >
                ✉️ Send Email to Selected
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedContacts([])}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedContacts.length === finalContacts.length && finalContacts.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
              <th>Job Title</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {finalContacts.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <h3>No Contacts Found</h3>
                    <p>
                      {hasActiveFilters || isAdvancedFilterActive 
                        ? 'No contacts match your current filters. Try adjusting your search criteria.' 
                        : 'Start by adding your first contact'}
                    </p>
                    {!hasActiveFilters && !isAdvancedFilterActive && (
                      <button className="btn btn-primary" onClick={handleCreateContact}>
                        + New Contact
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              finalContacts.map((contact) => (
                <tr key={contact.contact_id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.contact_id)}
                      onChange={() => handleSelectContact(contact.contact_id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </td>
                  <td>
                    <strong>{contact.first_name} {contact.last_name}</strong>
                  </td>
                  <td>{contact.email}</td>
                  <td>{contact.phone}</td>
                  <td>
                    {contact.business_id ? (
                      <span className="status-badge initial-contact" style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
                        {businessLookup[contact.business_id] || contact.business_name || 'Business'}
                      </span>
                    ) : (
                      <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                        Global
                      </span>
                    )}
                  </td>
                  <td>{contact.contact_type?.replace(/_/g, ' ')}</td>
                  <td>
                    <span className="status-badge">{contact.status}</span>
                  </td>
                  <td>{contact.job_title}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleViewContact(contact)}
                      >
                        View
                      </button>
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleEditContact(contact)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => handleDeleteContact(contact.contact_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedContact ? 'Edit Contact' : 'New Contact'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <ContactForm
                contact={selectedContact}
                onSave={handleSaveContact}
                onCancel={() => setShowForm(false)}
                isSaving={savingContact}
              />
            </div>
          </div>
        </div>
      )}

      {showBulkEmailModal && (
        <div className="modal-overlay" onClick={() => setShowBulkEmailModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Send Email to {selectedContacts.length} Contact{selectedContacts.length > 1 ? 's' : ''}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowBulkEmailModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                <strong>Recipients:</strong>
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                  {contacts
                    .filter(c => selectedContacts.includes(c.contact_id))
                    .map(c => `${c.first_name} ${c.last_name} (${c.email})`)
                    .join(', ')}
                </div>
              </div>

              <div className="form-group">
                <label>Subject <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={bulkEmailData.subject}
                  onChange={(e) => setBulkEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Message <span style={{ color: 'red' }}>*</span></label>
                <textarea
                  value={bulkEmailData.body}
                  onChange={(e) => setBulkEmailData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Enter email message..."
                  rows="10"
                  required
                  style={{ fontFamily: 'inherit' }}
                />
                <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  💡 Tip: You can use variables like {'{first_name}'} and {'{last_name}'} for personalization
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowBulkEmailModal(false)}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSendBulkEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? 'Sending...' : '✉️ Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdvancedFilter && (
        <AdvancedFilterBuilder
          onApplyFilters={handleApplyAdvancedFilters}
          onClose={() => setShowAdvancedFilter(false)}
          initialFilters={advancedFilterConfig}
        />
      )}
    </div>
  )
}
