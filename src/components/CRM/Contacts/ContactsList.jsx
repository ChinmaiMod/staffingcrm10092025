import { useEffect, useState } from 'react'
import { listContacts } from '../../../api/edgeFunctions'

export default function ContactsList() {
  const [contacts, setContacts] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await listContacts()
        if (!mounted) return
        setContacts(res.data || res)
      } catch (err) {
        setError(err.message || String(err))
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <h3>Contacts</h3>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {!contacts && !error && <div>Loading...</div>}
      {contacts && contacts.length === 0 && <div>No contacts found</div>}
      {contacts && contacts.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.contact_id}>
                <td>{c.first_name} {c.last_name}</td>
                <td>{c.email}</td>
                <td>{c.status_id}</td>
                <td>{new Date(c.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

