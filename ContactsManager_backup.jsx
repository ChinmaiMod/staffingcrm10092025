/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sendBulkEmail } from '../../../api/edgeFunctions'
import { useAuth } from '../../../contexts/AuthProvider'
import { applyAdvancedFilters, describeFilter, isFilterEmpty } from '../../../utils/filterEngine'
import { logger } from '../../../utils/logger'
import ContactForm from './ContactForm'
import ContactDetail from './ContactDetail'
import AdvancedFilterBuilder from './AdvancedFilterBuilder'

export default function ContactsManager() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, session } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterTimeframe, setFilterTimeframe] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState([])
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)
  const [bulkEmailData, setBulkEmailData] = useState({ subject: '', body: '' })
  const [sendingEmail, setSendingEmail] = useState(false)
  
  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilterConfig, setAdvancedFilterConfig] = useState(null)
  const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false)

  // Bug #13 fix: Add refs for cleanup to prevent memory leaks
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    loadContacts()
    
    // Apply filters from URL parameters
    const statusParam = searchParams.get('status')
    const timeframeParam = searchParams.get('timeframe')
    
    if (statusParam) {
      setFilterStatus(statusParam)
    }
    if (timeframeParam) {
      setFilterTimeframe(timeframeParam)
    }

    // Bug #13 fix: Cleanup function
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [searchParams])

  const loadContacts = async () => {
    // Bug #13 fix: Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Bug #13 fix: Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      // TODO: Replace with actual API call
      // const response = await listContacts({ signal: abortControllerRef.current.signal })
      // setContacts(response.data || [])
      
      // Mock data for demonstration
      setContacts([
        {
          contact_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '(555) 123-4567',
          contact_type: 'it_candidate',
          status: 'Initial Contact',
          visa_status: 'H1B',
          job_title: 'Java Full Stack Developer',
          years_experience: '4 to 6',
          created_at: new Date().toISOString(),
        },
        {
          contact_id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '(555) 987-6543',
          contact_type: 'healthcare_candidate',
          status: 'Spoke to candidate',
          job_title: 'Registered nurse (RN)',
          years_experience: '7 to 9',
          created_at: new Date().toISOString(),
        },
      ])
      
      // Bug #13 fix: Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false)
      }
    } catch (err) {
      // Bug #13 fix: Ignore abort errors, only handle real errors
      if (err.name === 'AbortError') {
        logger.log('loadContacts request was aborted')
        return
      }
      
      // Bug #13 fix: Only update state if component is still mounted
      if (isMountedRef.current) {
        setError(err.message)
        setLoading(false)
      }
    }
  }

  const handleCreateContact = () => {
    setSelectedContact(null)
    setShowForm(true)
  }

  const handleEditContact = (contact) => {
    setSelectedContact(contact)
    setShowForm(true)
  }

  const handleViewContact = (contact) => {
    setSelectedContact(contact)
  }

  const handleSaveContact = async (contactData, attachments = []) => {
    try {
      // TODO: Implement actual API call
      // Extract status change information
      const { statusChangeRemarks, statusChanged, ...contactFields } = contactData
      
      // if (selectedContact) {
      //   // Update existing contact
      //   await updateContact(selectedContact.contact_id, contactFields)
      //   
      //   // If status changed, save to status history
      //   if (statusChanged && statusChangeRemarks) {
      //     await supabase.from('contact_status_history').insert({
      //       contact_id: selectedContact.contact_id,
      //       old_status: selectedContact.status,
      //       new_status: contactFields.status,
      //       remarks: statusChangeRemarks,
      //       changed_by: user.id
      //     })
      //   }
      // } else {
      //   const newContact = await createContact(contactFields)
      //   
      //   // For new contacts, create initial status history entry
      //   if (statusChangeRemarks) {
      //     await supabase.from('contact_status_history').insert({
      //       contact_id: newContact.contact_id,
      //       old_status: null,
      //       new_status: contactFields.status,
      //       remarks: statusChangeRemarks,
      //       changed_by: user.id
      //     })
      //   }
      //   
      //   // Upload attachments if any
      //   if (attachments.length > 0) {
      //     for (const attachment of attachments) {
      //       const formData = new FormData()
      //       formData.append('file', attachment.file)
      //       formData.append('contact_id', newContact.contact_id)
      //       formData.append('description', attachment.description || '') // Include description
      //       await uploadContactAttachment(formData)
      //     }
      //   }
      // }
      
      logger.log('Saving contact with status history:', { 
        contactData: contactFields,
        statusChanged,
        statusChangeRemarks,
        attachments: attachments.map(a => ({ 
          name: a.name, 
          size: a.size, 
          description: a.description 
        }))
      })
      setShowForm(false)
      setSelectedContact(null)
      await loadContacts()
    } catch (err) {
      alert('Error saving contact: ' + err.message)
    }
  }

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    
    try {
      // TODO: Implement actual API call
      // await deleteContact(contactId)
      await loadContacts()
    } catch (err) {
      alert('Error deleting contact: ' + err.message)
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
    const matchesType = filterType === 'all' || contact.contact_type === filterType
    
    // Timeframe filter (mock implementation - in production, filter by created_at date)
    let matchesTimeframe = true
    if (filterTimeframe === 'week') {
      // In production: check if created_at is within last 7 days
      // For now, showing all contacts when "week" is selected
      matchesTimeframe = true
    } else if (filterTimeframe === 'month') {
      // In production: check if created_at is within last 30 days
      matchesTimeframe = true
    }

    return matchesSearch && matchesStatus && matchesType && matchesTimeframe
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
    setSearchParams({}) // Clear URL parameters
    handleClearAdvancedFilters() // Clear advanced filters
  }

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterType !== 'all' || filterTimeframe !== 'all' || isAdvancedFilterActive

  if (loading) {
    return <div className="loading">Loading contacts...</div>
  }

  if (selectedContact && !showForm) {
    return (
      <ContactDetail
        contact={selectedContact}
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
              {filterTimeframe !== 'all' && <span>• {filterTimeframe === 'week' ? 'This Week' : 'This Month'}</span>}
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
            <option value="empanelment_contact">Empanelment Contact</option>
            <option value="internal_india">Internal Hire (India)</option>
            <option value="internal_usa">Internal Hire (USA)</option>
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
