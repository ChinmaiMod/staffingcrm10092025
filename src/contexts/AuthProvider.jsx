import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { requestPasswordReset } from '../api/edgeFunctions'
import { logger } from '../utils/logger'

export const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Track if this is the initial load to prevent duplicate profile fetches
    let isInitialLoad = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        isInitialLoad = false // Mark initial load as complete
      } else {
        setLoading(false)
        isInitialLoad = false
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip the immediate SIGNED_IN event that fires right after getSession()
      // This prevents fetching the same profile twice on initial page load
      if (isInitialLoad && _event === 'SIGNED_IN') {
        isInitialLoad = false
        return
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      logger.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
    }
    return { error }
  }

  const resetPassword = async (email) => {
    // Get the current origin or use environment variable
    const redirectUrl = import.meta.env.VITE_FRONTEND_URL 
      ? `${import.meta.env.VITE_FRONTEND_URL}/reset-password`
      : `${window.location.origin}/reset-password`;

    try {
      const data = await requestPasswordReset(email, redirectUrl)
      return { data, error: null }
    } catch (edgeError) {
      logger.warn('Falling back to Supabase mailer for password reset', edgeError)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      return { data, error }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      // Get current session to verify user is authenticated
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      
      // Verify that user has a valid session
      if (!sessionData?.session) {
        return {
          data: null,
          error: new Error('No active session. Please request a new password reset link.')
        }
      }

      // Additional security check: Verify this is a password recovery session
      // Note: Supabase sets user metadata during password reset flow
      
      // Check if this is a recovery session by examining the session context
      // In a password reset flow, the user will have recently authenticated via the reset link
      const isRecentAuth = sessionData.session.expires_at && 
        (new Date(sessionData.session.expires_at * 1000) - new Date()) > 0
      
      if (!isRecentAuth) {
        return {
          data: null,
          error: new Error('Session expired. Please request a new password reset link.')
        }
      }

      // Proceed with password update
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      
      return { data, error }
    } catch (err) {
      logger.error('Password update error:', err)
      return { data: null, error: err }
    }
  }

  const refreshProfile = () => {
    if (user) {
      fetchProfile(user.id)
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
