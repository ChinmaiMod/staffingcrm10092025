import React, { useState } from 'react'

export default function StatusChangeModal({ 
  isOpen, 
  oldStatus, 
  newStatus, 
  onConfirm, 
  onCancel 
}) {
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!remarks.trim()) {
      setError('Remarks are required when changing status')
      return
    }
    if (remarks.trim().length < 10) {
      setError('Please provide more detailed remarks (at least 10 characters)')
      return
    }
    onConfirm(remarks)
    setRemarks('')
    setError('')
  }

  const handleCancel = () => {
    setRemarks('')
    setError('')
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Status Change Confirmation</h3>
          <button className="close-btn" onClick={handleCancel}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="status-change-info">
            <div className="status-change-row">
              <span className="label">Current Status:</span>
              <span className="status-badge old-status">{oldStatus || 'None'}</span>
            </div>
            <div className="status-arrow">↓</div>
            <div className="status-change-row">
              <span className="label">New Status:</span>
              <span className="status-badge new-status">{newStatus}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="required-label">
              Remarks <span className="required">*</span>
            </label>
            <p className="field-hint">
              Please explain the reason for this status change (minimum 10 characters)
            </p>
            <textarea
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value)
                setError('')
              }}
              placeholder="Example: Candidate confirmed interview availability for next week. Proceeding with technical round scheduling..."
              rows={5}
              className={error ? 'error' : ''}
            />
            {error && <div className="error-message">{error}</div>}
            <div className="char-count">
              {remarks.length} characters {remarks.length < 10 && `(${10 - remarks.length} more needed)`}
            </div>
          </div>

          <div className="info-box">
            <strong>Note:</strong> This remark will be permanently saved in the contact&apos;s status history 
            and cannot be edited later. Make sure to provide clear and complete information.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!remarks.trim() || remarks.trim().length < 10}
          >
            Confirm Status Change
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .status-change-info {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .status-change-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-change-row .label {
          font-weight: 500;
          color: #666;
          min-width: 120px;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
        }

        .old-status {
          background: #ffeaa7;
          color: #d63031;
        }

        .new-status {
          background: #55efc4;
          color: #00b894;
        }

        .status-arrow {
          text-align: center;
          font-size: 24px;
          color: #0984e3;
          margin: 8px 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .required-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        .required {
          color: #d63031;
          margin-left: 4px;
        }

        .field-hint {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }

        textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          min-height: 100px;
        }

        textarea:focus {
          outline: none;
          border-color: #0984e3;
        }

        textarea.error {
          border-color: #d63031;
        }

        .error-message {
          color: #d63031;
          font-size: 13px;
          margin-top: 6px;
        }

        .char-count {
          font-size: 12px;
          color: #999;
          margin-top: 6px;
          text-align: right;
        }

        .info-box {
          background: #e3f2fd;
          border-left: 4px solid #0984e3;
          padding: 12px;
          border-radius: 4px;
          font-size: 13px;
          color: #555;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d0d0d0;
        }

        .btn-primary {
          background: #0984e3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0770c4;
        }
      `}</style>
    </div>
  )
}
