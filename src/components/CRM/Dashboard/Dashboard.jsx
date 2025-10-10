import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Mock data for demonstration - replace with actual API calls
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    byStatus: {}
  })

  const [timeframe, setTimeframe] = useState('week') // 'week' or 'month'

  useEffect(() => {
    // Mock data - replace with actual API call
    setStats({
      total: 247,
      thisWeek: 18,
      thisMonth: 65,
      byStatus: {
        week: {
          'Initial Contact': 5,
          'Spoke to candidate': 4,
          'Resume needs to be prepared': 3,
          'Resume prepared and sent for review': 2,
          'Assigned to Recruiter': 2,
          'Recruiter started marketing': 1,
          'Placed into Job': 1,
        },
        month: {
          'Initial Contact': 20,
          'Spoke to candidate': 15,
          'Resume needs to be prepared': 10,
          'Resume prepared and sent for review': 8,
          'Assigned to Recruiter': 5,
          'Recruiter started marketing': 4,
          'Placed into Job': 3,
        }
      }
    })
  }, [])

  const statusColors = {
    'Initial Contact': '#3b82f6',
    'Spoke to candidate': '#8b5cf6',
    'Resume needs to be prepared': '#f59e0b',
    'Resume prepared and sent for review': '#10b981',
    'Assigned to Recruiter': '#ec4899',
    'Recruiter started marketing': '#6366f1',
    'Placed into Job': '#22c55e',
    'Candidate declined marketing': '#ef4444',
    'Candidate on vacation': '#f59e0b',
    'Candidate not responding': '#dc2626',
  }

  const currentData = stats.byStatus[timeframe] || {}

  const handleStatClick = (filterType) => {
    const params = new URLSearchParams()
    
    if (filterType === 'week') {
      params.set('timeframe', 'week')
    } else if (filterType === 'month') {
      params.set('timeframe', 'month')
    }
    // For 'all', no timeframe filter
    
    navigate(`/crm/contacts?${params.toString()}`)
  }

  const handleStatusClick = (status) => {
    const params = new URLSearchParams()
    params.set('status', status)
    params.set('timeframe', timeframe)
    navigate(`/crm/contacts?${params.toString()}`)
  }

  return (
    <div>
      <div className="crm-header">
        <h1>Dashboard</h1>
        <div className="crm-header-actions">
          <button 
            className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeframe('week')}
          >
            This Week
          </button>
          <button 
            className={`btn ${timeframe === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeframe('month')}
          >
            This Month
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div 
          className="stat-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => handleStatClick('all')}
          title="Click to view all contacts"
        >
          <h3>Total Contacts</h3>
          <p className="value">{stats.total}</p>
          <p className="change positive">↑ All time</p>
        </div>
        <div 
          className="stat-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => handleStatClick('week')}
          title="Click to view this week's contacts"
        >
          <h3>This Week</h3>
          <p className="value">{stats.thisWeek}</p>
          <p className="change positive">↑ {stats.thisWeek > 0 ? `+${stats.thisWeek}` : '0'} new</p>
        </div>
        <div 
          className="stat-card" 
          style={{ cursor: 'pointer' }}
          onClick={() => handleStatClick('month')}
          title="Click to view this month's contacts"
        >
          <h3>This Month</h3>
          <p className="value">{stats.thisMonth}</p>
          <p className="change positive">↑ {stats.thisMonth > 0 ? `+${stats.thisMonth}` : '0'} new</p>
        </div>
        <div className="stat-card">
          <h3>Active Status Types</h3>
          <p className="value">{Object.keys(currentData).length}</p>
          <p className="change">Different stages</p>
        </div>
      </div>

      <div className="data-table-container">
        <div className="table-header">
          <h2>Contacts by Status - {timeframe === 'week' ? 'Past Week' : 'Past Month'}</h2>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(currentData).map(([status, count]) => (
              <div 
                key={status} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onClick={() => handleStatusClick(status)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title={`Click to view ${count} ${status} contacts`}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#1e293b'
                  }}>
                    <span>{status}</span>
                    <span>{count} contacts</span>
                  </div>
                  <div style={{ 
                    height: '8px', 
                    background: '#e2e8f0', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      height: '100%', 
                      background: statusColors[status] || '#3b82f6',
                      width: `${(count / Math.max(...Object.values(currentData))) * 100}%`,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(currentData).length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h3>No Data Available</h3>
              <p>Start adding contacts to see statistics here</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px' }} className="data-table-container">
        <div className="table-header">
          <h2>Quick Actions</h2>
        </div>
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button className="btn btn-primary" onClick={() => window.location.href = '/crm/contacts'}>
            + Add New Contact
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/crm/data-admin'}>
            ⚙️ Manage Reference Data
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/crm/notifications'}>
            🔔 Configure Notifications
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/crm/email-templates'}>
            📧 Email Templates
          </button>
        </div>
      </div>
    </div>
  )
}
