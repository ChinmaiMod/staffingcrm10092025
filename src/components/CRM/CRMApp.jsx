import { useState } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import Dashboard from './Dashboard/Dashboard'
import ContactsManager from './Contacts/ContactsManager'
import PipelineView from './Pipelines/PipelineView'
import DataAdministration from './DataAdmin/DataAdministration'
import NotificationsManager from './Notifications/NotificationsManager'
import EmailTemplates from './EmailTemplates/EmailTemplates'
import Feedback from '../Feedback/Feedback'
import IssueReport from '../IssueReport/IssueReport'
import './CRM.css'

export default function CRMApp() {
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const handleNavigation = (path, menuId) => {
    setActiveMenu(menuId)
    navigate(path)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/crm' },
    { id: 'contacts', label: 'Contacts', icon: '👥', path: '/crm/contacts' },
    { id: 'pipelines', label: 'Pipelines', icon: '🔄', path: '/crm/pipelines' },
    { id: 'data-admin', label: 'Data Administration', icon: '⚙️', path: '/crm/data-admin' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/crm/notifications' },
    { id: 'email-templates', label: 'Email Templates', icon: '📧', path: '/crm/email-templates' },
    { id: 'feedback', label: 'Suggestions/Ideas ?', icon: '💡', path: '/crm/feedback' },
    { id: 'issue-report', label: 'Report an Issue', icon: '🐛', path: '/crm/issue-report' },
  ]

  return (
    <div className="crm-container">
      {/* Sidebar */}
      <aside className="crm-sidebar">
        <div className="crm-sidebar-header">
          <h2>Staffing CRM</h2>
          <p>{profile?.email || 'User'}</p>
        </div>
        <nav className="crm-nav">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`crm-nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path, item.id)}
            >
              <span className="crm-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={{ padding: '20px', marginTop: 'auto' }}>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/crm')}>
            ← Back to CRM Dashboard
          </button>
          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => navigate('/dashboard')}>
            ← Account
          </button>
          <button className="btn btn-danger" style={{ width: '100%', marginTop: '12px' }} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="crm-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contacts" element={<ContactsManager />} />
          <Route path="/pipelines" element={<PipelineView />} />
          <Route path="/data-admin/*" element={<DataAdministration />} />
          <Route path="/notifications" element={<NotificationsManager />} />
          <Route path="/email-templates" element={<EmailTemplates />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/issue-report" element={<IssueReport />} />
        </Routes>
      </main>
    </div>
  )
}
