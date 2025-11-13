import { useState, useEffect, useId } from 'react'
import { supabase } from '../../../api/supabaseClient'
import { useTenant } from '../../../contexts/TenantProvider'
import { useAuth } from '../../../contexts/AuthProvider'

export default function EmailTemplates() {
  const { tenant } = useTenant()
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    is_active: true,
  })
  const templateNameId = useId()
  const subjectId = useId()
  const bodyId = useId()
  const activeId = useId()

  useEffect(() => {
    if (tenant?.tenant_id) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.tenant_id])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      setTemplates(data || [])
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setFormData({ name: '', subject: '', body: '', is_active: true })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleEdit = (template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject || '',
      body: template.body_text || '',
      is_active: template.is_active !== false,
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    try {
      const payload = {
        tenant_id: tenant.tenant_id,
        name: formData.name,
        subject: formData.subject,
        body_text: formData.body,
        body_html: formData.body.replace(/\n/g, '<br>'), // Simple conversion
        created_by: user?.id,
      }

      if (selectedTemplate) {
        // Update existing template
        const { error: updateError } = await supabase
          .from('email_templates')
          .update(payload)
          .eq('template_id', selectedTemplate.template_id)
          .eq('tenant_id', tenant.tenant_id)

        if (updateError) throw updateError
        setSuccess('Template updated successfully!')
      } else {
        // Create new template
        const { error: insertError } = await supabase
          .from('email_templates')
          .insert([payload])

        if (insertError) throw insertError
        setSuccess('Template created successfully!')
      }

      setShowForm(false)
      loadTemplates()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Error saving template: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? This action cannot be undone.')) return
    
    try {
      setError('')
      
      const { error: deleteError } = await supabase
        .from('email_templates')
        .delete()
        .eq('template_id', id)
        .eq('tenant_id', tenant.tenant_id)

      if (deleteError) throw deleteError

      setSuccess('Template deleted successfully!')
      loadTemplates()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Error deleting: ' + err.message)
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

      {error && (
        <div className="alert alert-error" style={{ margin: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ margin: '20px' }}>
          {success}
        </div>
      )}

      <div className="data-table-container">
        <div className="table-header">
          <h2>Available Templates</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Use placeholders: {`{first_name}, {last_name}, {email}, {phone}, {business_name}, {status}`}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner"></div>
            <p>Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
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
                  key={template.template_id}
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
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Subject:</div>
                    <div style={{ fontSize: '14px', color: '#334155', fontWeight: 500 }}>{template.subject || 'No subject'}</div>
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
                      {(template.body_text || '').substring(0, 120)}...
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(template)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(template.template_id)}>
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{selectedTemplate ? 'Edit Template' : 'New Email Template'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor={templateNameId}>Template Name</label>
                  <input
                    id={templateNameId}
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Welcome Email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={subjectId}>Email Subject</label>
                  <input
                    id={subjectId}
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g., Welcome {first_name}"
                    required
                  />
                  <small>Use placeholders: {`{first_name}, {last_name}, {email}, {phone}, {business_name}, {status}`}</small>
                </div>

                <div className="form-group">
                  <label htmlFor={bodyId}>Email Body</label>
                  <textarea
                    id={bodyId}
                    value={formData.body}
                    onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                    placeholder={'Dear {first_name},\n\nYour message here...\n\nBest regards,\nYour Team'}
                    rows="10"
                    required
                  />
                  <small>Supports plain text and placeholders</small>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id={activeId}
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor={activeId} style={{ margin: 0 }}>
                      Active (available for notifications)
                    </label>
                  </div>
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

