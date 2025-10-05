import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useAuth } from './AuthProvider'

const TenantContext = createContext({})

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

export function TenantProvider({ children }) {
  const { profile } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTenantData(profile.tenant_id)
    } else {
      setLoading(false)
    }
  }, [profile])

  const fetchTenantData = async (tenantId) => {
    try {
      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (tenantError) throw tenantError
      setTenant(tenantData)

      // Fetch active subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError && subError.code !== 'PGRST116') throw subError
      setSubscription(subData)
    } catch (error) {
      console.error('Error fetching tenant data:', error)
      setTenant(null)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshTenantData = () => {
    if (profile?.tenant_id) {
      fetchTenantData(profile.tenant_id)
    }
  }

  const hasActivePlan = () => {
    return subscription && subscription.status === 'ACTIVE'
  }

  const getPlanName = () => {
    return subscription?.plan_name || 'FREE'
  }

  const value = {
    tenant,
    subscription,
    loading,
    refreshTenantData,
    hasActivePlan,
    getPlanName,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
