import { useState, useEffect } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useTenant } from '../../../contexts/TenantProvider'
import { useAuth } from '../../../contexts/AuthProvider'

export default function NotificationsManager() {
  const { tenant } = useTenant()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    subject: '',
    body: '',
    recipient_type: 'CONTACTS',
    recipient_filters: {
      contact_type: '',
      status: ''
    },
    custom_recipients: '',
    business_id: '',
    repeat_count: 1,
    interval_days: 1,
    start_date: new Date().toISOString().split('T')[0],
    is_active: true,
  })

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadNotifications()
      loadBusinesses()
      loadTemplates()
    }
  }, [tenant?.tenant_id])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotifications(data || [])
    } catch (err) {
      console.error('Error loading notifications:', err)
      setError('Failed to load notifications: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadBusinesses = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('businesses')
        .select('business_id, business_name, is_default')
        .eq('tenant_id', tenant.tenant_id)
        .order('is_default', { ascending: false })
        .order('business_name', { ascending: true })

      if (fetchError) throw fetchError
      setBusinesses(data || [])
    } catch (err) {
      console.error('Error loading businesses:', err)
    }
  }

  const loadTemplates = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setTemplates(data || [])
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  const handleTemplateChange = (template_id) => {
    const selectedTemplate = templates.find(t => t.template_id === template_id)
    
    if (selectedTemplate) {
      setFormData(prev => ({
        ...prev,
        template_id: template_id,
        subject: selectedTemplate.subject || '',
        body: selectedTemplate.body_text || ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        template_id: '',
        subject: '',
        body: ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Prepare payload
      const payload = {
        tenant_id: tenant.tenant_id,
        name: formData.name,
        template_id: formData.template_id || null,
        subject: formData.subject,
        body: formData.body,
        recipient_type: formData.recipient_type,
        business_id: formData.business_id || null,
        repeat_count: parseInt(formData.repeat_count),
        interval_days: parseInt(formData.interval_days),
        start_date: formData.start_date,
        next_send_date: formData.start_date,
        is_active: formData.is_active,
        created_by: user?.id
      }

      // Handle recipient filters
      if (formData.recipient_type === 'CONTACTS' || formData.recipient_type === 'INTERNAL_STAFF') {
        const filters = {}
        if (formData.recipient_filters.contact_type) {
          filters.contact_type = formData.recipient_filters.contact_type
        }
        if (formData.recipient_filters.status) {
          filters.status = formData.recipient_filters.status
        }
        payload.recipient_filters = filters
      } else if (formData.recipient_type === 'CUSTOM') {
        // Parse custom recipients
        const emails = formData.custom_recipients
          .split(',')
          .map(e => e.trim())
          .filter(e => e && e.includes('@'))
        
        if (emails.length === 0) {
          setError('Please provide at least one valid email address')
          return
        }
        payload.custom_recipients = emails
      }

      const { error: insertError } = await supabase
        .from('scheduled_notifications')
        .insert([payload])

      if (insertError) throw insertError

      setSuccess('Notification scheduled successfully!')
      setShowForm(false)
      resetForm()
      loadNotifications()
    } catch (err) {
      console.error('Error saving notification:', err)
      setError('Error saving notification: ' + err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      template_id: '',
      subject: '',
      body: '',
      recipient_type: 'CONTACTS',
      recipient_filters: {
        contact_type: '',
        status: ''
      },
      custom_recipients: '',
      business_id: '',
      repeat_count: 1,
      interval_days: 1,
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this notification? This will stop all future sends.')) return
    try {
      const { error: deleteError } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('notification_id', id)

      if (deleteError) throw deleteError

      setSuccess('Notification deleted successfully')
      loadNotifications()
    } catch (err) {
      console.error('Error deleting:', err)
      setError('Error deleting notification: ' + err.message)
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error: updateError } = await supabase
        .from('scheduled_notifications')
        .update({ is_active: !currentStatus })
        .eq('notification_id', id)

      if (updateError) throw updateError

      setSuccess(`Notification ${!currentStatus ? 'activated' : 'paused'} successfully`)
      loadNotifications()
    } catch (err) {
      console.error('Error toggling:', err)
      setError('Error updating notification: ' + err.message)
    }
  }

  const CONTACT_TYPES = [
    { value: 'IT_CANDIDATE', label: 'IT Candidate' },
    { value: 'HEALTHCARE_CANDIDATE', label: 'Healthcare Candidate' },
    { value: 'VENDOR_CLIENT', label: 'Vendor Client' },
    { value: 'VENDOR_EMPANELMENT', label: 'Vendor Empanelment' },
    { value: 'EMPLOYEE_INDIA', label: 'Employee - India' },
    { value: 'EMPLOYEE_USA', label: 'Employee - USA' }
  ]

  const STATUSES = [
    'Initial Contact',
    'Spoke to candidate',
    'Resume needs to be prepared',
    'Resume prepared and sent for review',
    'Assigned to Recruiter',
    'Recruiter started marketing',
    'Placed into Job'
  ]

  const getRecipientDescription = (notification) => {
    if (notification.recipient_type === 'CONTACTS') {
      const filters = notification.recipient_filters || {}
      let desc = 'Contacts'
      if (filters.contact_type) desc += ` (${filters.contact_type.replace(/_/g, ' ')})`
      if (filters.status) desc += ` - Status: ${filters.status}`
      return desc
    } else if (notification.recipient_type === 'INTERNAL_STAFF') {
      return 'Internal Staff'
    } else if (notification.recipient_type === 'CUSTOM') {
      const count = notification.custom_recipients?.length || 0
      return `Custom (${count} email${count !== 1 ? 's' : ''})`
    }
    return notification.recipient_type
  }

  if (loading) {
    return <div className="loading">Loading notifications...</div>
  }

  return (
    <div>
      <div className="crm-header">
        <h1>🔔 Scheduled Notifications</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Notification
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '16px', padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      <div className="data-table-container">
        <div className="table-header">
          <h2>Scheduled Email Notifications</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Automatically send recurring email notifications to contacts and staff
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">�</div>
            <h3>No Notifications Scheduled</h3>
            <p>Create your first automated notification campaign</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Schedule Notification
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Recipients</th>
                <th>Business</th>
                <th>Schedule</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(notification => (
                <tr key={notification.notification_id}>
                  <td><strong>{notification.name}</strong></td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {notification.subject}
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                      {getRecipientDescription(notification)}
                    </span>
                  </td>
                  <td>
                    {notification.business_id ? (
                      <span className="status-badge" style={{ background: '#e0f2fe', color: '#0c4a6e' }}>
                        {businesses.find(b => b.business_id === notification.business_id)?.business_name || 'Business'}
                      </span>
                    ) : (
                      <span className="status-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        All
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>
                      <div>{notification.repeat_count}× every {notification.interval_days} day{notification.interval_days > 1 ? 's' : ''}</div>
                      {notification.next_send_date && !notification.is_completed && (
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                          Next: {new Date(notification.next_send_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>
                      <div>{notification.times_sent} / {notification.repeat_count} sent</div>
                      <div style={{ 
                        width: '100px', 
                        height: '6px', 
                        background: '#e2e8f0', 
                        borderRadius: '3px', 
                        overflow: 'hidden',
                        marginTop: '4px'
                      }}>
                        <div style={{ 
                          width: `${(notification.times_sent / notification.repeat_count) * 100}%`, 
                          height: '100%', 
                          background: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      notification.is_completed ? 'status-badge-completed' : 
                      notification.is_active ? 'initial-contact' : 'status-badge-paused'
                    }`} style={
                      notification.is_completed ? { background: '#f3f4f6', color: '#6b7280' } :
                      notification.is_active ? { background: '#d1fae5', color: '#065f46' } :
                      { background: '#fee2e2', color: '#991b1b' }
                    }>
                      {notification.is_completed ? '✓ Completed' : notification.is_active ? '● Active' : '⏸ Paused'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!notification.is_completed && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleToggleActive(notification.notification_id, notification.is_active)}
                        >
                          {notification.is_active ? 'Pause' : 'Resume'}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(notification.notification_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>📧 Schedule New Notification</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  {/* Basic Information */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Notification Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Weekly Check-in Campaign"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email Template (Optional)</label>
                    <select
                      value={formData.template_id}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                    >
                      <option value="">-- No Template (Enter Manually) --</option>
                      {templates.map(template => (
                        <option key={template.template_id} value={template.template_id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Select a template to auto-fill subject and body, or leave empty to enter manually
                    </small>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email Subject *</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Hello {first_name}! Time for your check-in"
                      required
                    />
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Use {'{first_name}'}, {'{last_name}'}, {'{email}'}, {'{phone}'}, {'{business_name}'}, {'{status}'} for personalization
                    </small>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Email Body *</label>
                    <textarea
                      rows={6}
                      value={formData.body}
                      onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Hi {first_name},&#10;&#10;This is a reminder to...&#10;&#10;Best regards,&#10;Your Team"
                      required
                      style={{ fontFamily: 'inherit', resize: 'vertical' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Supports {'{first_name}'}, {'{last_name}'}, {'{email}'}, {'{phone}'}, {'{business_name}'}, {'{status}'} placeholders
                    </small>
                  </div>

                  {/* Schedule Settings */}
                  <div className="form-group">
                    <label>Number of Sends *</label>
                    <select
                      value={formData.repeat_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, repeat_count: e.target.value }))}
                      required
                    >
                      <option value="1">1 time</option>
                      <option value="2">2 times</option>
                      <option value="3">3 times</option>
                      <option value="4">4 times</option>
                      <option value="5">5 times</option>
                    </select>
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Total number of emails to send
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Interval (Days) *</label>
                    <select
                      value={formData.interval_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, interval_days: e.target.value }))}
                      required
                    >
                      <option value="1">Every 1 day</option>
                      <option value="2">Every 2 days</option>
                      <option value="3">Every 3 days</option>
                      <option value="4">Every 4 days</option>
                      <option value="5">Every 5 days</option>
                    </select>
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      Days between each send
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <small style={{ color: '#64748b', fontSize: '12px' }}>
                      When to send first email
                    </small>
                  </div>

                  {/* Recipient Configuration */}
                  <div className="form-group">
                    <label>Recipient Type *</label>
                    <select
                      value={formData.recipient_type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        recipient_type: e.target.value,
                        recipient_filters: { contact_type: '', status: '' },
                        custom_recipients: ''
                      }))}
                      required
                    >
                      <option value="CONTACTS">Contacts</option>
                      <option value="INTERNAL_STAFF">Internal Staff</option>
                      <option value="CUSTOM">Custom Email List</option>
                    </select>
                  </div>

                  {formData.recipient_type === 'CONTACTS' && (
                    <>
                      <div className="form-group">
                        <label>Filter by Contact Type</label>
                        <select
                          value={formData.recipient_filters.contact_type}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            recipient_filters: { ...prev.recipient_filters, contact_type: e.target.value }
                          }))}
                        >
                          <option value="">All Types</option>
                          {CONTACT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Filter by Status</label>
                        <select
                          value={formData.recipient_filters.status}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            recipient_filters: { ...prev.recipient_filters, status: e.target.value }
                          }))}
                        >
                          <option value="">All Statuses</option>
                          {STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {formData.recipient_type === 'CUSTOM' && (
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Email Addresses *</label>
                      <textarea
                        rows={3}
                        value={formData.custom_recipients}
                        onChange={(e) => setFormData(prev => ({ ...prev, custom_recipients: e.target.value }))}
                        placeholder="email1@example.com, email2@example.com, email3@example.com"
                        required
                        style={{ fontFamily: 'inherit' }}
                      />
                      <small style={{ color: '#64748b', fontSize: '12px' }}>
                        Separate multiple emails with commas
                      </small>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Business</label>
                    <select
                      value={formData.business_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, business_id: e.target.value }))}
                    >
                      <option value="">All Businesses</option>
                      {businesses.map(business => (
                        <option key={business.business_id} value={business.business_id}>
                          {business.business_name}
                          {business.is_default ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Start immediately
                    </label>
                    <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginLeft: '26px' }}>
                      Begin sending based on start date
                    </small>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  background: '#f8fafc', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0' 
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                    📊 Schedule Summary
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.8' }}>
                    <div>
                      • Will send <strong>{formData.repeat_count}</strong> email{formData.repeat_count > 1 ? 's' : ''}
                    </div>
                    <div>
                      • Every <strong>{formData.interval_days}</strong> day{formData.interval_days > 1 ? 's' : ''}
                    </div>
                    <div>
                      • Starting on <strong>{new Date(formData.start_date).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      • To: <strong>
                        {formData.recipient_type === 'CONTACTS' ? 'Contacts' : 
                         formData.recipient_type === 'INTERNAL_STAFF' ? 'Internal Staff' : 
                         'Custom List'}
                      </strong>
                      {formData.recipient_filters.contact_type && ` (${formData.recipient_filters.contact_type.replace(/_/g, ' ')})`}
                      {formData.recipient_filters.status && ` - ${formData.recipient_filters.status}`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
