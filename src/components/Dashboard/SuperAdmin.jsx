import { useState, useEffect } from 'react'
import { supabase } from '../../api/supabaseClient'
import { useAuth } from '../../contexts/AuthProvider'
import { updateTenantStatus } from '../../api/edgeFunctions'

export default function SuperAdmin() {
  const { profile } = useAuth()
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setTenants(data)
    } catch (err) {
      console.error(err)
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (tenantId, status) => {
    if (!confirm(`Set tenant ${tenantId} to ${status}?`)) return
    try {
      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.access_token
      const json = await updateTenantStatus({ tenant_id: tenantId, status }, accessToken)
      if (json.error) throw new Error(json.error || JSON.stringify(json))
      alert('Tenant updated')
      fetchTenants()
    } catch (err) {
      alert('Error updating tenant: ' + err.message)
    }
  }

  if (!profile || profile.role !== 'SUPER_ADMIN') return <div>Access denied</div>

  return (
    <div>
      <h2>Super Admin - Tenants</h2>
      {loading ? <div>Loading...</div> : (
        <table>
          <thead><tr><th>Tenant ID</th><th>Company</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.tenant_id}>
                <td>{t.tenant_id}</td>
                <td>{t.company_name}</td>
                <td>{t.status}</td>
                <td>
                  {t.status !== 'SUSPENDED' && <button onClick={() => updateStatus(t.tenant_id, 'SUSPENDED')}>Suspend</button>}
                  {t.status !== 'ACTIVE' && <button onClick={() => updateStatus(t.tenant_id, 'ACTIVE')}>Activate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
