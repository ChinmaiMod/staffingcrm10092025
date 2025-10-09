import React from 'react'

export default function StatusHistory({ statusHistory, loading }) {
  if (loading) {
    return (
      <div className="status-history-loading">
        <div className="spinner"></div>
        <p>Loading status history...</p>
      </div>
    )
  }

  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="status-history-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p>No status changes recorded yet</p>
        <small>Status changes and their remarks will appear here</small>
      </div>
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return formatDate(dateString)
  }

  return (
    <div className="status-history-container">
      <div className="status-history-header">
        <h4>Status Change Timeline</h4>
        <span className="history-count">{statusHistory.length} change{statusHistory.length > 1 ? 's' : ''}</span>
      </div>

      <div className="status-timeline">
        {statusHistory.map((history, index) => (
          <div key={history.history_id || index} className="timeline-item">
            <div className="timeline-marker">
              <div className="timeline-dot"></div>
              {index !== statusHistory.length - 1 && <div className="timeline-line"></div>}
            </div>

            <div className="timeline-content">
              <div className="timeline-header">
                <div className="status-change-badges">
                  {history.old_status && (
                    <>
                      <span className="status-badge old">{history.old_status}</span>
                      <span className="arrow">→</span>
                    </>
                  )}
                  <span className="status-badge new">{history.new_status}</span>
                </div>
                <div className="timeline-meta">
                  <span className="timeline-time" title={formatDate(history.changed_at)}>
                    {formatRelativeTime(history.changed_at)}
                  </span>
                </div>
              </div>

              <div className="timeline-remarks">
                <div className="remarks-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Remarks:
                </div>
                <p className="remarks-text">{history.remarks}</p>
              </div>

              {history.changed_by_name && (
                <div className="timeline-author">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Changed by {history.changed_by_name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .status-history-container {
          padding: 20px;
        }

        .status-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e0e0e0;
        }

        .status-history-header h4 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .history-count {
          background: #e3f2fd;
          color: #0984e3;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .status-history-loading,
        .status-history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #999;
        }

        .status-history-empty svg {
          color: #ddd;
          margin-bottom: 16px;
        }

        .status-history-empty p {
          margin: 8px 0 4px 0;
          font-size: 16px;
          color: #666;
        }

        .status-history-empty small {
          font-size: 13px;
          color: #999;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #0984e3;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .status-timeline {
          position: relative;
        }

        .timeline-item {
          display: flex;
          margin-bottom: 24px;
          position: relative;
        }

        .timeline-item:last-child {
          margin-bottom: 0;
        }

        .timeline-marker {
          position: relative;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #0984e3;
          border: 3px solid #e3f2fd;
          z-index: 1;
          flex-shrink: 0;
        }

        .timeline-line {
          width: 2px;
          flex-grow: 1;
          background: #e0e0e0;
          margin-top: 4px;
        }

        .timeline-content {
          flex: 1;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e0e0e0;
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 12px;
        }

        .status-change-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          display: inline-block;
        }

        .status-badge.old {
          background: #fff3cd;
          color: #856404;
          text-decoration: line-through;
          opacity: 0.8;
        }

        .status-badge.new {
          background: #d4edda;
          color: #155724;
        }

        .arrow {
          color: #666;
          font-weight: bold;
        }

        .timeline-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timeline-time {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }

        .timeline-remarks {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .remarks-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .remarks-label svg {
          color: #999;
        }

        .remarks-text {
          margin: 0;
          color: #333;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .timeline-author {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 12px;
          color: #666;
        }

        .timeline-author svg {
          color: #999;
        }

        @media (max-width: 768px) {
          .timeline-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .timeline-meta {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
