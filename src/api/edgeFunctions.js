const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function callEdgeFunction(functionName, data, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  }

  const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    // Try to parse the error response body
    const errorBody = await response.json().catch(() => null)
    
    // Extract the actual error message from the response
    if (errorBody && errorBody.error) {
      throw new Error(errorBody.error)
    }
    
    // Fallback to generic message
    const errorMessage = errorBody?.message || `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return response.json()
}

export async function createTenantAndProfile(userId, email, username, companyName) {
  return callEdgeFunction('createTenantAndProfile', {
    userId,
    email,
    username,
    companyName,
  })
}

export async function resendVerification(email) {
  return callEdgeFunction('resendVerification', { email })
}

export async function verifyToken(token) {
  return callEdgeFunction('verifyToken', { token })
}

export async function requestPasswordReset(email, redirectTo = null) {
  const payload = { email }
  if (redirectTo) {
    payload.redirectTo = redirectTo
  }
  return callEdgeFunction('requestPasswordReset', payload)
}

export async function createCheckoutSession(priceId, tenantId, profileId, billingCycle, promoCode = null) {
  return callEdgeFunction('createCheckoutSession', {
    priceId,
    tenantId,
    profileId,
    billingCycle,
    promoCode,
  })
}

// Bulk Email Function
export async function sendBulkEmail(recipients, subject, body, token) {
  return callEdgeFunction('sendBulkEmail', {
    recipients,
    subject,
    body,
  }, token)
}

export async function applyPromoCode(code, planName, billingCycle) {
  return callEdgeFunction('applyPromoCode', {
    code,
    planName,
    billingCycle,
  })
}

export async function getPostLoginRoute(userId, token) {
  return callEdgeFunction('getPostLoginRoute', { userId }, token)
}

export async function createInvite(data, token) {
  return callEdgeFunction('createInvite', data, token)
}

export async function acceptInvite(tokenValue, userId) {
  return callEdgeFunction('acceptInvite', { token: tokenValue, userId }, null)
}

export async function updateTenantStatus(data, token) {
  return callEdgeFunction('updateTenantStatus', data, token)
}

// CRM: contacts CRUD via crm_contacts edge function
export async function listContacts(token) {
  // GET / -> list is performed by calling the function URL directly
  const headers = {
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  }
  const res = await fetch(`${FUNCTIONS_URL}/crm_contacts`, { headers })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to list contacts'
    throw new Error(errorMessage)
  }
  return res.json()
}

export async function getContact(id, token) {
  const headers = { 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  const res = await fetch(`${FUNCTIONS_URL}/crm_contacts/${id}`, { headers })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to get contact'
    throw new Error(errorMessage)
  }
  return res.json()
}

export async function createContact(data, token) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  const res = await fetch(`${FUNCTIONS_URL}/crm_contacts`, { method: 'POST', headers, body: JSON.stringify(data) })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to create contact'
    throw new Error(errorMessage)
  }
  return res.json()
}

export async function updateContact(id, data, token) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  const res = await fetch(`${FUNCTIONS_URL}/crm_contacts/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to update contact'
    throw new Error(errorMessage)
  }
  return res.json()
}

export async function deleteContact(id, token) {
  const headers = { 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  const res = await fetch(`${FUNCTIONS_URL}/crm_contacts/${id}`, { method: 'DELETE', headers })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to delete contact'
    throw new Error(errorMessage)
  }
  return res.json()
}

// Email templates / notifications wrappers (use edge functions or direct DB functions later)
export async function listEmailTemplates(token) {
  const headers = { 'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  const res = await fetch(`${FUNCTIONS_URL}/email_templates`, { headers })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    const errorMessage = errorBody?.error || errorBody?.message || 'Failed to list email templates'
    throw new Error(errorMessage)
  }
  return res.json()
}

