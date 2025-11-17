import { useMemo, useState } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthProvider'
import { usePermissions } from '../../contexts/PermissionsProvider'
import Dashboard from './Dashboard/Dashboard'
import ContactsManager from './Contacts/ContactsManager'
import ClientDashboard from './Clients/ClientDashboard'
import ClientsManager from './Clients/ClientsManager'
import JobOrdersManager from './Clients/JobOrdersManager'
import PipelineView from './Pipelines/PipelineView'
import DataAdministration from './DataAdmin/DataAdministration'
import NotificationsManager from './Notifications/NotificationsManager'
import EmailTemplates from './EmailTemplates/EmailTemplates'
import Newsletter from './Newsletter/Newsletter'
import Feedback from '../Feedback/Feedback'
import IssueReport from '../IssueReport/IssueReport'
import './CRM.css'

export default function CRMApp() {
  const navigate = useNavigate()
  const { signOut, profile } = useAuth()
  const { clientPermissions, loading: permissionsLoading } = usePermissions()
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [expandedMenus, setExpandedMenus] = useState({})

  const handleNavigation = (path, menuId) => {
    setActiveMenu(menuId)
    navigate(path)
  }

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const baseMenuItems = useMemo(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/crm' },
    { id: 'contacts', label: 'Contacts', icon: '👥', path: '/crm/contacts' },
    { 
      id: 'clients', 
      label: 'Clients', 
      icon: '🏢', 
      path: '/crm/clients',
      subItems: [
        { id: 'client-dashboard', label: 'Client Dashboard', path: '/crm/clients/dashboard' },
        { id: 'client-information', label: 'Client Information', path: '/crm/clients' },
        { id: 'job-orders', label: 'Job Orders', path: '/crm/clients/job-orders' },
      ]
    },
    { id: 'pipelines', label: 'Pipelines', icon: '🔄', path: '/crm/pipelines' },
    { id: 'newsletter', label: 'Newsletter', icon: '📰', path: '/crm/newsletter' },
    { id: 'data-admin', label: 'Data Administration', icon: '⚙️', path: '/crm/data-admin' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/crm/notifications' },
    { id: 'email-templates', label: 'Email Templates', icon: '📧', path: '/crm/email-templates' },
    { id: 'feedback', label: 'Suggestions/Ideas ?', icon: '💡', path: '/crm/feedback' },
    { id: 'issue-report', label: 'Report an Issue', icon: '🐛', path: '/crm/issue-report' },
  ]), [])

  const menuItems = useMemo(() => {
    return baseMenuItems.reduce((acc, item) => {
      if (item.id !== 'clients') {
        acc.push(item)
        return acc
      }

      if (!clientPermissions.canViewSection) {
        return acc
      }

      const filteredSubItems = (item.subItems || []).filter((subItem) => {
        if (subItem.id === 'client-dashboard') return clientPermissions.canAccessDashboard
        if (subItem.id === 'client-information') return clientPermissions.canAccessInfo
        if (subItem.id === 'job-orders') return clientPermissions.canAccessJobOrders
        return true
      })

      if (filteredSubItems.length === 0) {
        return acc
      }

      acc.push({ ...item, subItems: filteredSubItems })
      return acc
    }, [])
  }, [baseMenuItems, clientPermissions])

  if (permissionsLoading) {
    return (
      <div className="crm-loading">
        <p>Loading workspace permissions...</p>
      </div>
    )
  }

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
            <div key={item.id}>
              <div
                className={`crm-nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => {
                  if (item.subItems) {
                    toggleMenu(item.id)
                  } else {
                    handleNavigation(item.path, item.id)
                  }
                }}
              >
                <span className="crm-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.subItems && (
                  <span className="crm-nav-arrow">
                    {expandedMenus[item.id] ? '▼' : '▶'}
                  </span>
                )}
              </div>
              {item.subItems && expandedMenus[item.id] && (
                <div className="crm-nav-submenu">
                  {item.subItems.map((subItem) => (
                    <div
                      key={subItem.id}
                      className={`crm-nav-subitem ${activeMenu === subItem.id ? 'active' : ''}`}
                      onClick={() => handleNavigation(subItem.path, subItem.id)}
                    >
                      {subItem.label}
                    </div>
                  ))}
                </div>
              )}
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
          <Route path="/clients/dashboard" element={<ClientDashboard />} />
          <Route path="/clients/job-orders" element={<JobOrdersManager />} />
          <Route path="/clients" element={<ClientsManager />} />
          <Route path="/pipelines" element={<PipelineView />} />
          <Route path="/newsletter" element={<Newsletter />} />
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
