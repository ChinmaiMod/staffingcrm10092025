import { createContext, useContext, useEffect, useRef, useState } from 'react'
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
  
  // Track if component is mounted to prevent setState on unmounted component
  const isMountedRef = useRef(true)
  // Track abort controller for cleanup
  const abortControllerRef = useRef(null)

  useEffect(() => {
    // Cancel any pending requests when tenant_id changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (profile?.tenant_id) {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()
      fetchTenantData(profile.tenant_id, abortControllerRef.current.signal)
    } else {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }

    // Cleanup function
    return () => {
      // Abort any pending requests when component unmounts or tenant_id changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [profile?.tenant_id]) // Only depend on tenant_id, not entire profile object

  // Set isMounted flag on mount/unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTenantData = async (tenantId, signal) => {
    try {
      // Fetch tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (tenantError) throw tenantError
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setTenant(tenantData)
      }

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
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setSubscription(subData)
      }
    } catch (error) {
      // Don't log error if request was aborted (component unmounted)
      if (error.name !== 'AbortError') {
        console.error('Error fetching tenant data:', error)
      }
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setTenant(null)
        setSubscription(null)
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  const refreshTenantData = () => {
    if (profile?.tenant_id) {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      fetchTenantData(profile.tenant_id, abortControllerRef.current.signal)
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
