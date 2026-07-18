import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient.js'

const AuthCtx = createContext(null)

// window.location.origin resolves to capacitor://localhost inside the native
// app shell, so auth emails need an explicit real-site origin there.
const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error('loadProfile', error)
      return null
    }
    setProfile(data)
    return data
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    // If email confirmation is off, a session is returned immediately.
    if (data.session) await loadProfile(data.session.user.id)
    return { data }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await loadProfile(data.session.user.id)
    return { data }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  // Send a password-reset email (link lands on /reset to set a new password).
  const resetPassword = (email) =>
    supabase.auth
      .resetPasswordForEmail(email, { redirectTo: `${PUBLIC_URL}/reset` })
      .then(({ error }) => (error ? { error: error.message } : { ok: true }))

  // Passwordless: email a one-time sign-in link (lands signed-in on /calendar).
  const sendMagicLink = (email) =>
    supabase.auth
      .signInWithOtp({ email, options: { emailRedirectTo: `${PUBLIC_URL}/calendar`, shouldCreateUser: false } })
      .then(({ error }) => (error ? { error: error.message } : { ok: true }))

  // Set a new password (used on /reset, where a recovery session is active).
  const updatePassword = (password) =>
    supabase.auth.updateUser({ password }).then(({ error }) => (error ? { error: error.message } : { ok: true }))

  const updateProfile = async (patch) => {
    const userId = session?.user?.id
    if (!userId) return { error: 'Not signed in' }
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select()
      .single()
    if (error) return { error: error.message }
    setProfile(data)
    return { data }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    sendMagicLink,
    updatePassword,
    refreshProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
