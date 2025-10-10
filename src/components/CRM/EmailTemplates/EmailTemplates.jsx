import { useState, useEffect } from 'react'

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    is_active: true,
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    // TODO: Load from API
    setTemplates([
      {
        id: 1,
        name: 'Welcome Template',
        subject: 'Welcome to our Staffing Services',
        body: 'Dear {{first_name}},\n\nThank you for contacting us...',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Resume Ready Template',
        subject: 'Your Resume is Ready for Review',
        body: 'Hi {{first_name}},\n\nYour resume has been prepared...',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ])
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setFormData({ name: '', subject: '', body: '', is_active: true })
    setShowForm(true)
  }

  const handleEdit = (template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // TODO: API call
      setShowForm(false)
      loadTemplates()
    } catch (err) {
      alert('Error saving template: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    try {
      // TODO: API call
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      alert('Error deleting: ' + err.message)
    }
  }

  return (
    <div>
      <div className="crm-header">
        <h1>Email Templates</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          + New Template
        </button>
      </div>

      <div className="data-table-container">
        <div className="table-header">
          <h2>Available Templates</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Use variables: {`{{first_name}}, {{last_name}}, {{email}}, {{status}}`}
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📧</div>
            <h3>No Email Templates</h3>
            <p>Create your first email template for notifications</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              + Create First Template
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {templates.map(template => (
                <div
                  key={template.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    background: 'white',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{template.name}</h3>
                    <span className={`status-badge ${template.is_active ? 'initial-contact' : ''}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Subject:</div>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{template.subject}</div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Body Preview:</div>
                    <div style={{
                      fontSize: '13px',
                      color: '#475569',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '80px',
                      overflow: 'hidden',
                      lineHeight: '1.5',
                    }}>
                      {template.body.substring(0, 120)}...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(template)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(template.id)}>
                      Delete
                    </button>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTemplate ? 'Edit Template' : 'New Email Template'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Welcome {{first_name}}"
                    required
                  />
                  <small>Use variables: {`{{first_name}}, {{last_name}}, {{email}}, {{status}}`}</small>
                </div>

                <div className="form-group">
                  <label>Email Body</label>
                  <textarea
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder={'Dear {{first_name}},\n\nYour message here...\n\nBest regards,\nYour Team'}
                    rows="10"
                    required
                  />
                  <small>Supports plain text and variables</small>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      style={{ width: 'auto' }}
                    />
                    Active (available for notifications)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
