import { useState, useCallback, useEffect } from 'react'
import StatusHistory from './StatusHistory'
import { supabase } from '../../../api/supabaseClient'
import { useTenant } from '../../../contexts/TenantProvider'
import { useAuth } from '../../../contexts/AuthProvider'
import { createUniqueFileName, formatFileSize } from '../../../utils/fileUtils'
import { logger } from '../../../utils/logger'

export default function ContactDetail({ contact, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('details')
  const [attachments, setAttachments] = useState([])
  const [comments, setComments] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [newComment, setNewComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  const { tenant } = useTenant()
  const { profile } = useAuth()

  const loadStatusHistory = useCallback(async () => {
    if (!contact?.contact_id) return

    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('contact_status_history')
        .select(`
          history_id,
          contact_id,
          old_status,
          new_status,
          notes,
          changed_at,
          changed_by,
          profiles:profiles!contact_status_history_changed_by_fkey(id, email, full_name)
        `)
        .eq('contact_id', contact.contact_id)
        .order('changed_at', { ascending: false })

      if (error) {
        throw error
      }

      const mapped = (data || []).map((item) => ({
        history_id: item.history_id,
        contact_id: item.contact_id,
        old_status: item.old_status,
        new_status: item.new_status,
        remarks: item.notes,
        changed_by: item.changed_by,
        changed_by_name: item.profiles?.full_name || item.profiles?.email || 'System',
        changed_at: item.changed_at
      }))

      setStatusHistory(mapped)
    } catch (err) {
      logger.error('Error loading status history:', err)
      setStatusHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [contact?.contact_id])

  const loadAttachments = useCallback(async () => {
    if (!contact?.contact_id) return
    setLoadingAttachments(true)

    try {
      const { data, error } = await supabase
        .from('contact_attachments')
        .select('attachment_id, file_name, file_path, description, size_bytes, content_type, uploaded_at, uploaded_by')
        .eq('contact_id', contact.contact_id)
        .order('uploaded_at', { ascending: false })

      if (error) {
        throw error
      }

      const storageBucket = supabase.storage.from('contact-attachments')
      const withUrls = await Promise.all(
        (data || []).map(async (item) => {
          const { data: signed, error: signedError } = await storageBucket.createSignedUrl(item.file_path, 60 * 60)
          if (signedError) {
            throw signedError
          }

          return {
            attachment_id: item.attachment_id,
            file_name: item.file_name,
            file_path: item.file_path,
            description: item.description,
            size_bytes: item.size_bytes,
            content_type: item.content_type,
            uploaded_at: item.uploaded_at,
            uploaded_by: item.uploaded_by,
            url: signed?.signedUrl || null
          }
        })
      )

      setAttachments(withUrls)
    } catch (err) {
      logger.error('Error loading attachments:', err)
      setAttachments([])
    } finally {
      setLoadingAttachments(false)
    }
  }, [contact?.contact_id])

  useEffect(() => {
    // Comments functionality pending API implementation
    setComments([])
    loadAttachments()
    loadStatusHistory()
  }, [contact, loadAttachments, loadStatusHistory])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !tenant?.tenant_id || !contact?.contact_id) return

    setUploading(true)
    try {
      const storageBucket = supabase.storage.from('contact-attachments')

      for (const file of files) {
        const uniqueName = createUniqueFileName(file.name)
        const storagePath = `${tenant.tenant_id}/${contact.contact_id}/${uniqueName}`

        const { error: uploadError } = await storageBucket.upload(storagePath, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        })

        if (uploadError) {
          throw uploadError
        }

        const { error: metadataError } = await supabase
          .from('contact_attachments')
          .insert({
            contact_id: contact.contact_id,
            tenant_id: tenant.tenant_id,
            business_id: contact.business_id || null,
            file_name: file.name,
            file_path: storagePath,
            content_type: file.type || null,
            size_bytes: file.size || null,
            uploaded_by: profile?.id || null
          })

        if (metadataError) {
          throw metadataError
        }
      }

      await loadAttachments()
    } catch (err) {
      logger.error('Error uploading files:', err)
      alert('Error uploading files: ' + (err.message || 'Unknown error'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return
    const record = attachments.find((item) => item.attachment_id === attachmentId)
    if (!record) return

    try {
      const storageBucket = supabase.storage.from('contact-attachments')

      if (record.file_path) {
        const { error: removeError } = await storageBucket.remove([record.file_path])
        if (removeError) {
          throw removeError
        }
      }

      const { error: deleteError } = await supabase
        .from('contact_attachments')
        .delete()
        .eq('attachment_id', attachmentId)
        .eq('contact_id', contact.contact_id)

      if (deleteError) {
        throw deleteError
      }

      setAttachments((prev) => prev.filter((item) => item.attachment_id !== attachmentId))
    } catch (err) {
      logger.error('Error deleting attachment:', err)
      alert('Error deleting attachment: ' + (err.message || 'Unknown error'))
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const comment = {
        id: Date.now(),
        text: newComment,
        created_by: profile?.email || 'Current User',
        created_at: new Date().toISOString()
      }
      setComments((prev) => [comment, ...prev])
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
                <label>Business</label>
                <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  {contact.business_name || 'Global'}
                </div>
              </div>

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
                  <span className="status-badge">{contact.workflow_status?.workflow_status || contact.status || 'Unknown'}</span>
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
                id="contact-detail-file-upload"
              />
              <label htmlFor="contact-detail-file-upload" className="btn btn-primary">
                {uploading ? '⏳ Uploading...' : '📎 Upload Files'}
              </label>
              <small style={{ marginLeft: '12px', color: '#64748b' }}>
                Select multiple files (Resume, certificates, etc.)
              </small>
            </div>

            {loadingAttachments ? (
              <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <h3>Loading attachments...</h3>
                <p>Please wait while we fetch files</p>
              </div>
            ) : attachments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📎</div>
                <h3>No Attachments</h3>
                <p>Upload resumes, certificates, or other documents</p>
              </div>
            ) : (
              <div className="attachments-grid">
                {attachments.map(attachment => (
                  <div key={attachment.attachment_id} className="attachment-card">
                    <button
                      className="attachment-delete"
                      onClick={() => handleDeleteAttachment(attachment.attachment_id)}
                    >
                      ✕
                    </button>
                    <div className="attachment-icon">📄</div>
                    <a
                      href={attachment.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="attachment-name"
                      style={{ color: '#1d4ed8', textDecoration: 'none' }}
                    >
                      {attachment.file_name}
                    </a>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                      {formatFileSize(attachment.size_bytes || 0)}
                    </div>
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
                      {attachment.uploaded_at ? new Date(attachment.uploaded_at).toLocaleString() : 'Unknown'}
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
