import React, { useEffect, useState } from 'react'
import { supabase } from '../../api/supabaseClient'
import { useAuth } from '../../contexts/AuthProvider'
import { createInvite } from '../../api/edgeFunctions'
import { useTenant } from '../../contexts/TenantProvider'
import { handleSupabaseError } from '../../utils/validators'

export default function TenantAdmin() {
  const { profile } = useAuth()
  const { tenant, loading, refreshTenantData } = useTenant()
  const [users, setUsers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (tenant?.tenant_id) fetchUsers()
  }, [tenant])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, role, status, created_at')
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users', err)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail) return
    setSending(true)
    try {
      const body = { tenant_id: tenant.tenant_id, email: inviteEmail, role: 'USER' }
      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.access_token
      const json = await createInvite(body, accessToken)
      if (json.error) throw new Error(json.error || JSON.stringify(json))
      alert('Invite created — an email was sent (if configured). Token available in response for testing.')
      setInviteEmail('')
      refreshTenantData()
    } catch (err) {
      console.error(err)
      alert('Failed to create invite: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const changeRole = async (userId, newRole) => {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) {
        const errorMessage = handleSupabaseError(error)
        throw new Error(errorMessage)
      }
      fetchUsers()
    } catch (err) {
      console.error('Role update error:', err)
      alert(err.message || 'Failed to update role')
    }
  }

  const removeUser = async (userId) => {
    if (!confirm('Remove user from tenant? This will revoke their access to this company.')) return
    try {
      const { error } = await supabase.from('profiles').update({ tenant_id: null, role: 'USER' }).eq('id', userId)
      if (error) {
        const errorMessage = handleSupabaseError(error)
        throw new Error(errorMessage)
      }
      fetchUsers()
    } catch (err) {
      console.error('Remove user error:', err)
      alert(err.message || 'Failed to remove user')
    }
  }

  if (loading) return <div>Loading tenant...</div>
  if (!tenant) return <div>No tenant</div>

  return (
    <div>
      <h2>Tenant Admin - {tenant.company_name}</h2>

      <section>
        <h3>Invite user</h3>
        <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@example.com" />
        <button onClick={sendInvite} disabled={sending}>Send Invite</button>
      </section>

      <section>
        <h3>Users</h3>
        <table>
          <thead>
            <tr><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status}</td>
                <td>
                  {u.role !== 'ADMIN' && <button onClick={() => changeRole(u.id, 'ADMIN')}>Make Admin</button>}
                  {u.role === 'ADMIN' && <button onClick={() => changeRole(u.id, 'USER')}>Revoke Admin</button>}
                  <button onClick={() => removeUser(u.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
