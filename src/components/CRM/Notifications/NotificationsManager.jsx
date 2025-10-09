import React, { useState, useEffect } from 'react'

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState([])
  const [templates, setTemplates] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    trigger_status: '',
    email_template_id: '',
    recipient_type: 'candidate',
    send_timing: 'immediate',
    is_active: true,
  })

  useEffect(() => {
    loadNotifications()
    loadTemplates()
  }, [])

  const loadNotifications = async () => {
    // TODO: Load from API
    setNotifications([
      {
        id: 1,
        name: 'Welcome Email',
        trigger_status: 'Initial Contact',
        email_template: 'Welcome Template',
        recipient_type: 'candidate',
        send_timing: 'immediate',
        is_active: true,
      },
      {
        id: 2,
        name: 'Resume Ready Notification',
        trigger_status: 'Resume prepared and sent for review',
        email_template: 'Resume Ready Template',
        recipient_type: 'candidate',
        send_timing: 'immediate',
        is_active: true,
      },
    ])
  }

  const loadTemplates = async () => {
    // TODO: Load from API
    setTemplates([
      { id: 1, name: 'Welcome Template' },
      { id: 2, name: 'Resume Ready Template' },
      { id: 3, name: 'Interview Scheduled Template' },
    ])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // TODO: API call to save
      setShowForm(false)
      loadNotifications()
    } catch (err) {
      alert('Error saving notification: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this notification?')) return
    try {
      // TODO: API call
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      alert('Error deleting: ' + err.message)
    }
  }

  const handleToggleActive = async (id) => {
    try {
      // TODO: API call
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, is_active: !n.is_active } : n
      ))
    } catch (err) {
      alert('Error toggling: ' + err.message)
    }
  }

  const STATUSES = [
    'Initial Contact', 'Spoke to candidate', 'Resume needs to be prepared',
    'Resume prepared and sent for review', 'Assigned to Recruiter',
    'Recruiter started marketing', 'Placed into Job'
  ]

  return (
    <div>
      <div className="crm-header">
        <h1>Notification Configuration</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Notification
        </button>
      </div>

      <div className="data-table-container">
        <div className="table-header">
          <h2>Configured Notifications</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Automatically send emails when contact status changes
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No Notifications Configured</h3>
            <p>Set up automated email notifications based on status changes</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Create First Notification
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Trigger (Status)</th>
                <th>Email Template</th>
                <th>Recipient</th>
                <th>Timing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map(notification => (
                <tr key={notification.id}>
                  <td><strong>{notification.name}</strong></td>
                  <td>
                    <span className="status-badge">{notification.trigger_status}</span>
                  </td>
                  <td>{notification.email_template}</td>
                  <td>{notification.recipient_type}</td>
                  <td>{notification.send_timing}</td>
                  <td>
                    <span className={`status-badge ${notification.is_active ? 'initial-contact' : ''}`}>
                      {notification.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleToggleActive(notification.id)}
                      >
                        {notification.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(notification.id)}
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Notification Configuration</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Notification Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Welcome Email"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Trigger Status (When status becomes...)</label>
                    <select
                      value={formData.trigger_status}
                      onChange={(e) => setFormData(prev => ({ ...prev, trigger_status: e.target.value }))}
                      required
                    >
                      <option value="">Select status...</option>
                      {STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Email Template</label>
                    <select
                      value={formData.email_template_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_template_id: e.target.value }))}
                      required
                    >
                      <option value="">Select template...</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Recipient</label>
                    <select
                      value={formData.recipient_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipient_type: e.target.value }))}
                      required
                    >
                      <option value="candidate">Candidate/Contact</option>
                      <option value="recruiter">Assigned Recruiter</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="all">All (Candidate + Recruiter)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Send Timing</label>
                    <select
                      value={formData.send_timing}
                      onChange={(e) => setFormData(prev => ({ ...prev, send_timing: e.target.value }))}
                      required
                    >
                      <option value="immediate">Immediately</option>
                      <option value="1_hour">1 Hour Later</option>
                      <option value="1_day">1 Day Later</option>
                      <option value="3_days">3 Days Later</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        style={{ width: 'auto' }}
                      />
                      Active (start sending immediately)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
