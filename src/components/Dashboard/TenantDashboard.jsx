import { useAuth } from '../../contexts/AuthProvider'
import { useTenant } from '../../contexts/TenantProvider'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function TenantDashboard() {
  const { profile, signOut } = useAuth()
  const { tenant, subscription, getPlanName } = useTenant()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const planName = getPlanName()

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Staffing CRM</h2>
        </div>
        <div className="nav-actions">
          <span className="user-email">{profile?.email}</span>
          <button onClick={handleSignOut} className="btn btn-outline-sm">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Welcome to Your Account</h1>
          <p>Manage your business with ease</p>
        </div>

        <div className="info-cards">
          <div className="info-card">
            <h3>Company</h3>
            <p>{tenant?.company_name || 'N/A'}</p>
          </div>

          <div className="info-card">
            <h3>Current Plan</h3>
            <p>{planName}</p>
            {planName === 'FREE' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/plans')}
              >
                Upgrade Now
              </button>
            )}
          </div>

          <div className="info-card">
            <h3>Role</h3>
            <p>{profile?.role || 'User'}</p>
          </div>

          <div className="info-card">
            <h3>Status</h3>
            <p className={`status-badge ${profile?.status?.toLowerCase()}`}>
              {profile?.status || 'Unknown'}
            </p>
          </div>
        </div>

        {profile?.role === 'ADMIN' && (
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => navigate('/tenant-admin')}>Tenant Admin</button>
          </div>
        )}

        {subscription && (
          <div className="subscription-info">
            <h2>Subscription Details</h2>
            <div className="subscription-details">
              <div className="detail-item">
                <span className="label">Plan:</span>
                <span className="value">{subscription.plan_name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Billing Cycle:</span>
                <span className="value">{subscription.billing_cycle}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className="value status-badge active">
                  {subscription.status}
                </span>
              </div>
              {subscription.end_date && (
                <div className="detail-item">
                  <span className="label">Renewal Date:</span>
                  <span className="value">
                    {new Date(subscription.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modules-section">
          <h2>Available Modules</h2>
          <div className="modules-grid">
            <div className="module-card">
              <h3>CRM</h3>
              <p>Customer Relationship Management</p>
              <button className="btn btn-primary" onClick={() => navigate('/crm')}>
                Access CRM
              </button>
            </div>

            {planName === 'SUITE' && (
              <>
                <div className="module-card">
                  <h3>HRMS</h3>
                  <p>Human Resource Management System</p>
                  <button className="btn btn-primary" onClick={() => navigate('/hrms')}>
                    Access HRMS
                  </button>
                </div>

                <div className="module-card">
                  <h3>Finance</h3>
                  <p>Financial Management System</p>
                  <button className="btn btn-primary" onClick={() => navigate('/finance')}>
                    Access Finance
                  </button>
                </div>
              </>
            )}

            {planName !== 'SUITE' && (
              <div className="module-card locked">
                <h3>🔒 More Modules</h3>
                <p>Unlock HRMS and Finance modules</p>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/plans')}
                >
                  Upgrade to Suite
                </button>
              </div>
            )}

            <div className="module-card">
              <h3>💡 Suggestions/Ideas ?</h3>
              <p>Share your feedback and ideas</p>
              <button className="btn btn-primary" onClick={() => navigate('/feedback')}>
                Submit Feedback
              </button>
            </div>

            <div className="module-card">
              <h3>🐛 Report an Issue</h3>
              <p>Report bugs and technical problems</p>
              <button className="btn btn-danger" onClick={() => navigate('/report-issue')}>
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
