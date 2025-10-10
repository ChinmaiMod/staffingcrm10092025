import { useState, useCallback, useEffect } from 'react'
import StatusHistory from './StatusHistory'

export default function ContactDetail({ contact, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('details')
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [newComment, setNewComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadStatusHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      // TODO: Replace with actual API call
      // const response = await supabase
      //   .from('contact_status_history')
      //   .select('*, changed_by:profiles(full_name)')
      //   .eq('contact_id', contact.contact_id)
      //   .order('changed_at', { ascending: false })
      
      // Mock data for demonstration
      setStatusHistory([
        {
          history_id: 1,
          contact_id: contact.contact_id,
          old_status: 'Initial Contact',
          new_status: 'Spoke to candidate',
          remarks: 'Had a detailed conversation with the candidate. They are actively looking for remote opportunities and have 5+ years of Java experience. Interested in full-stack roles with Spring Boot and React.',
          changed_by: 'current-user-id',
          changed_by_name: 'John Admin',
          changed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        },
        {
          history_id: 2,
          contact_id: contact.contact_id,
          old_status: null,
          new_status: 'Initial Contact',
          remarks: 'First contact established via LinkedIn. Candidate responded to our outreach message.',
          changed_by: 'current-user-id',
          changed_by_name: 'Jane Recruiter',
          changed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        },
      ])
      setLoadingHistory(false)
    } catch (err) {
      console.error('Error loading status history:', err)
      setLoadingHistory(false)
    }
  }, [contact.contact_id])

  useEffect(() => {
    // TODO: Load attachments and comments from API
    // Mock data
    setAttachments([
      { id: 1, name: 'resume.pdf', url: '#', uploaded_at: new Date().toISOString() },
      { id: 2, name: 'certificate.jpg', url: '#', uploaded_at: new Date().toISOString() },
    ])
    setComments([
      {
        id: 1,
        text: 'Initial contact made. Candidate seems interested in remote positions.',
        created_by: 'John Admin',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        text: 'Sent resume template for review.',
        created_by: 'Jane Recruiter',
        created_at: new Date().toISOString(),
      },
    ])

    // Load status history
    loadStatusHistory()
  }, [contact, loadStatusHistory])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    try {
      // TODO: Implement file upload to Supabase Storage
      // For each file:
      // 1. Upload to storage
      // 2. Create attachment record in DB
      // 3. Refresh attachments list
      
      alert('File upload not yet implemented. Need to configure Supabase Storage.')
      setUploading(false)
    } catch (err) {
      alert('Error uploading files: ' + err.message)
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return

    try {
      // TODO: Delete from storage and DB
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      alert('Error deleting attachment: ' + err.message)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      // TODO: Save comment to DB
      const comment = {
        id: Date.now(),
        text: newComment,
        created_by: 'Current User', // TODO: Get from auth context
        created_at: new Date().toISOString(),
      }
      setComments(prev => [comment, ...prev])
      setNewComment('')
    } catch (err) {
      alert('Error adding comment: ' + err.message)
    }
  }

  return (
    <div>
      <div className="crm-header">
        <h1>{contact.first_name} {contact.last_name}</h1>
        <div className="crm-header-actions">
          <button className="btn btn-primary" onClick={() => onEdit(contact)}>
            Edit Contact
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(contact.contact_id)}>
            Delete
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`tab ${activeTab === 'statusHistory' ? 'active' : ''}`}
          onClick={() => setActiveTab('statusHistory')}
        >
          Status History ({statusHistory.length})
        </button>
        <button
          className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
          onClick={() => setActiveTab('attachments')}
        >
          Attachments ({attachments.length})
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({comments.length})
        </button>
      </div>

      {activeTab === 'details' && (
        <div className="data-table-container">
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Email</label>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {contact.email}
                </div>
              </div>

              <div className="form-group">
                <label>Phone</label>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {contact.phone || 'N/A'}
                </div>
              </div>

              <div className="form-group">
                <label>Contact Type</label>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {contact.contact_type?.replace(/_/g, ' ')}
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div style={{ padding: '10px' }}>
                  <span className="status-badge">{contact.status}</span>
                </div>
              </div>

              {contact.visa_status && (
                <div className="form-group">
                  <label>Visa Status</label>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    {contact.visa_status}
                  </div>
                </div>
              )}

              {contact.job_title && (
                <div className="form-group">
                  <label>Job Title</label>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    {contact.job_title}
                  </div>
                </div>
              )}

              {contact.years_experience && (
                <div className="form-group">
                  <label>Years of Experience</label>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    {contact.years_experience}
                  </div>
                </div>
              )}

              {contact.country && (
                <div className="form-group">
                  <label>Location</label>
                  <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                    {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Created At</label>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {new Date(contact.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {contact.remarks && (
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Remarks</label>
                <div style={{ padding: '14px', background: '#f8fafc', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {contact.remarks}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'statusHistory' && (
        <StatusHistory statusHistory={statusHistory} loading={loadingHistory} />
      )}

      {activeTab === 'attachments' && (
        <div className="data-table-container">
          <div className="modal-body">
            <div style={{ marginBottom: '20px' }}>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="btn btn-primary">
                {uploading ? '⏳ Uploading...' : '📎 Upload Files'}
              </label>
              <small style={{ marginLeft: '12px', color: '#64748b' }}>
                Select multiple files (Resume, certificates, etc.)
              </small>
            </div>

            {attachments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📎</div>
                <h3>No Attachments</h3>
                <p>Upload resumes, certificates, or other documents</p>
              </div>
            ) : (
              <div className="attachments-grid">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="attachment-card">
                    <button
                      className="attachment-delete"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                    >
                      ✕
                    </button>
                    <div className="attachment-icon">📄</div>
                    <div className="attachment-name">{attachment.name}</div>
                    {attachment.description && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#475569', 
                        marginTop: '6px',
                        fontStyle: 'italic',
                        padding: '4px 8px',
                        background: '#f1f5f9',
                        borderRadius: '4px'
                      }}>
                        {attachment.description}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      {new Date(attachment.uploaded_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="data-table-container">
          <div className="modal-body">
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or note..."
                rows="3"
                style={{ width: '100%', marginBottom: '10px' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                Add Comment
              </button>
            </div>

            {comments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3>No Comments</h3>
                <p>Add notes or comments about this contact</p>
              </div>
            ) : (
              <div className="comments-list">
                {comments.map(comment => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">{comment.created_by}</span>
                      <span className="comment-date">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="comment-body">{comment.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
