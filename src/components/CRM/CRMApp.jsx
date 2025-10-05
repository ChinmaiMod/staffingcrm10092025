import React from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import ContactsList from './Contacts/ContactsList'
import DataAdministration from './DataAdmin/DataAdministration'
import EmailTemplates from './EmailTemplates/EmailTemplates'

export default function CRMApp() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Staffing CRM</h2>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/crm">Dashboard</Link> | <Link to="/crm/data-admin">Data Administration</Link> | <Link to="/crm/email-templates">Email Templates</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/data-admin/*" element={<DataAdministration />} />
        <Route path="/contacts" element={<ContactsList />} />
        <Route path="/email-templates" element={<EmailTemplates />} />
      </Routes>
    </div>
  )
}

function Dashboard() {
  return (
    <div>
      <h3>Dashboard</h3>
      <p>Contacts by status (past week / past month)</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, padding: 12, border: '1px solid #ddd' }}>Chart: Past Week (placeholder)</div>
        <div style={{ flex: 1, padding: 12, border: '1px solid #ddd' }}>Chart: Past Month (placeholder)</div>
      </div>
    </div>
  )
}
