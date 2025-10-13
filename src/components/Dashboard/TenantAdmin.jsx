import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../api/supabaseClient'
import { createInvite } from '../../api/edgeFunctions'
import { useTenant } from '../../contexts/TenantProvider'
import { useAuth } from '../../contexts/AuthProvider'
import { handleSupabaseError } from '../../utils/validators'
import './TenantAdmin.css'

const ALLOWED_INVITER_ROLES = ['ADMIN', 'SUPER_ADMIN']

export default function TenantAdmin() {
  const { tenant, loading: tenantLoading, refreshTenantData } = useTenant()
  const { profile, loading: authLoading } = useAuth()

  const [users, setUsers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('USER')
  const [sending, setSending] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState('')

  const tenantId = tenant?.tenant_id

  const canManageInvites = useMemo(() => {
    const role = profile?.role ?? ''
    return ALLOWED_INVITER_ROLES.includes(role)
  }, [profile?.role])

  const fetchUsers = useCallback(async () => {
    if (!tenantId) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, role, status, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users', err)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) {
      fetchUsers()
    }
  }, [tenantId, fetchUsers])

  const validateEmail = (email) => {
    return /^[\w.!#$%&’*+/=?`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/.test(String(email).toLowerCase())
  }

  const resetInviteState = () => {
    setInviteResult(null)
    setInviteError(null)
    setShowToken(false)
    setCopyFeedback('')
  }

  const sendInvite = async () => {
    resetInviteState()

    if (!inviteEmail) {
      setInviteError('Please enter an email address.')
      return
    }

    if (!validateEmail(inviteEmail)) {
      setInviteError('Enter a valid email address (example@company.com).')
      return
    }

    setSending(true)
    try {
      const body = { tenant_id: tenantId, email: inviteEmail, role: inviteRole }
      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.access_token
      const json = await createInvite(body, accessToken)
      if (json.error) throw new Error(json.error || JSON.stringify(json))

      setInviteResult(json.invite)
      setInviteError(null)
      setShowToken(true)
      setInviteEmail('')
      setInviteRole('USER')
      refreshTenantData()
      await fetchUsers()
    } catch (err) {
      console.error(err)
      setInviteError(err.message || 'Failed to create invite.')
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
    if (!window.confirm('Remove this user? They will lose access to your CRM tenant.')) return
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tenant_id: null, role: 'USER' })
        .eq('id', userId)
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

  if (tenantLoading || authLoading) {
    return (
      <div className="tenant-admin tenant-admin__loading">
        <div className="tenant-admin__spinner" aria-label="Loading tenant admin" />
        <p>Preparing tenant admin tools…</p>
      </div>
    )
  }

  if (!tenantId) {
    return <div className="tenant-admin tenant-admin__no-tenant">No tenant selected.</div>
  }

  if (!canManageInvites) {
    return (
      <div className="tenant-admin">
        <div className="tenant-admin__card tenant-admin__no-access">
          <h2>Administrator Access Required</h2>
          <p>
            Only the tenant owner or a designated administrator can invite teammates to this CRM.
            Ask your administrator to grant you access if you need to manage users.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-admin">
      <header className="tenant-admin__header">
        <div>
          <p className="tenant-admin__eyebrow">Tenant Owner Portal</p>
          <h1>{tenant?.company_name ?? 'Your company'}</h1>
          <p className="tenant-admin__subtitle">
            Invite new teammates, manage administrator access, and keep your CRM workspace secure.
          </p>
        </div>
      </header>

      <div className="tenant-admin__grid">
        <section className="tenant-admin__card tenant-admin__invite-card">
          <h2>Invite a Team Member</h2>
          <p className="tenant-admin__card-subtitle">
            Send a secure invitation. Links expire after 7 days if not accepted.
          </p>

          <div className="tenant-admin__form">
            <label htmlFor="invite-email">Email address</label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              autoComplete="email"
              disabled={sending}
            />

            <label htmlFor="invite-role">Initial role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              disabled={sending}
            >
              <option value="USER">CRM Member</option>
              <option value="ADMIN">Tenant Administrator</option>
            </select>

            {inviteError && (
              <div className="tenant-admin__alert" role="alert">
                {inviteError}
              </div>
            )}

            <button
              type="button"
              onClick={sendInvite}
              className="tenant-admin__primary-button"
              disabled={sending}
            >
              {sending ? 'Sending invite…' : 'Send Invite'}
            </button>
          </div>

          {inviteResult && (
            <div className="tenant-admin__invite-result">
              <h3>Invite created successfully</h3>
              <p>
                We&apos;ll email the invite if outbound email is configured. Share this token directly
                if you prefer a manual hand-off.
              </p>
              <div className="tenant-admin__token-row">
                <code className={`tenant-admin__token ${showToken ? 'tenant-admin__token--visible' : ''}`}>
                  {showToken ? inviteResult.token : '••••••••••••••••••••••••'}
                </code>
                <div className="tenant-admin__token-actions">
                  <button type="button" onClick={() => setShowToken((prev) => !prev)}>
                    {showToken ? 'Hide token' : 'Show token'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteResult.token)
                        setCopyFeedback('Copied to clipboard!')
                        setTimeout(() => setCopyFeedback(''), 2500)
                      } catch (copyErr) {
                        console.error(copyErr)
                        setCopyFeedback('Copy failed. Copy the token manually.')
                      }
                    }}
                  >
                    Copy token
                  </button>
                </div>
              </div>
              {copyFeedback && <p className="tenant-admin__copy-feedback">{copyFeedback}</p>}
            </div>
          )}
        </section>

        <section className="tenant-admin__card tenant-admin__users-card">
          <div className="tenant-admin__card-heading">
            <div>
              <h2>Active Users</h2>
              <p className="tenant-admin__card-subtitle">
                Promote trusted teammates or remove access at any time.
              </p>
            </div>
            <span className="tenant-admin__badge">{users.length} users</span>
          </div>

          <div className="tenant-admin__table-wrapper">
            <table className="tenant-admin__table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="tenant-admin__actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="tenant-admin__empty">
                      No users found yet. Send your first invite to get started.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="tenant-admin__user-email">{user.email}</div>
                      {user.username && <div className="tenant-admin__user-meta">{user.username}</div>}
                    </td>
                    <td>
                      <span className={`tenant-admin__role-badge tenant-admin__role-badge--${(user.role || 'user').toLowerCase()}`}>
                        {user.role || 'USER'}
                      </span>
                    </td>
                    <td>
                      <span className={`tenant-admin__status-badge tenant-admin__status-badge--${(user.status || 'unknown').toLowerCase()}`}>
                        {user.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td>
                    <td className="tenant-admin__actions-column">
                      <div className="tenant-admin__action-group">
                        {user.role !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => changeRole(user.id, 'ADMIN')}
                            className="tenant-admin__action-button"
                          >
                            Promote to Admin
                          </button>
                        )}
                        {user.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => changeRole(user.id, 'USER')}
                            className="tenant-admin__action-button"
                          >
                            Revoke Admin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="tenant-admin__action-button tenant-admin__action-button--danger"
                        >
                          Remove User
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
