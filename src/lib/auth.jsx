import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient.js'
import { mfaGateStatus } from './mfa.js'

const AuthCtx = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mfaStatus, setMfaStatus] = useState(null)
  // True only for a session established via a Supabase recovery link (the
  // PASSWORD_RECOVERY auth event), never for an ordinary password login.
  // MfaRecover.jsx's unenroll action is gated on this so a session obtained
  // with just a stolen password (no TOTP device) can't strip MFA off an
  // account it doesn't otherwise control.
  const [recoveryEvent, setRecoveryEvent] = useState(false)

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

  // Reads the current TOTP enrollment + assurance level and computes whether
  // the user still needs to enroll or complete a challenge. Called after
  // every session change so ProtectedRoute/SetupGate/etc. can gate on it.
  const refreshMfaStatus = useCallback(async (activeSession) => {
    if (!activeSession) {
      setMfaStatus(null)
      return
    }
    const [{ data: factorsData }, { data: levelData }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    const verifiedFactorCount = (factorsData?.totp || []).filter((f) => f.status === 'verified').length
    setMfaStatus(
      mfaGateStatus({
        verifiedFactorCount,
        currentLevel: levelData?.currentLevel,
        nextLevel: levelData?.nextLevel,
      })
    )
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await Promise.all([loadProfile(data.session?.user?.id), refreshMfaStatus(data.session)])
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      loadProfile(newSession?.user?.id)
      refreshMfaStatus(newSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryEvent(true)
      if (event === 'SIGNED_OUT') setRecoveryEvent(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile, refreshMfaStatus])

  // Enroll a new TOTP factor. Returns the QR code (SVG data URI) + secret to
  // show the user; enrollment isn't complete until mfaVerify succeeds.
  // friendlyName must be unique per user -- a fixed default 422s on any second
  // enroll attempt (component remount, back-button, dropped network on first
  // try) because the previous unverified factor still holds that name.
  const mfaEnroll = () => supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `totp-${Date.now()}` })

  // Confirm a freshly-enrolled factor, or answer a login challenge for an
  // existing one — both are challenge+verify, the only difference is when
  // it's called from.
  const mfaVerify = async (factorId, code) => {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) return { error: challengeError.message }
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (error) return { error: error.message }
    await refreshMfaStatus(session)
    return { data }
  }

  const mfaUnenroll = async (factorId) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) return { error: error.message }
    await refreshMfaStatus(session)
    return { ok: true }
  }

  const mfaListFactors = () => supabase.auth.mfa.listFactors()

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

  // Permanently deletes the account: server-side purge via the delete-account
  // edge function (auth record + everything cascaded from it), then clears
  // the local session since the account no longer exists to sign out of.
  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke('delete-account')
    if (error) return { error: error.message }
    await supabase.auth.signOut()
    setProfile(null)
    return { ok: true }
  }

  // Send a password-reset email (link lands on /reset to set a new password).
  const resetPassword = (email) =>
    supabase.auth
      .resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
      .then(({ error }) => (error ? { error: error.message } : { ok: true }))

  // Lost-authenticator recovery: same Supabase recovery-link mechanism as
  // resetPassword, but lands on /mfa-recover so the proven email click can be
  // used to remove the unreachable TOTP factor instead of setting a password.
  const sendMfaRecoveryLink = (email) =>
    supabase.auth
      .resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/mfa-recover` })
      .then(({ error }) => (error ? { error: error.message } : { ok: true }))

  // Passwordless: email a one-time sign-in link (lands signed-in on /calendar).
  const sendMagicLink = (email) =>
    supabase.auth
      .signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/calendar`, shouldCreateUser: false } })
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
    mfaStatus,
    recoveryEvent,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    updateProfile,
    resetPassword,
    sendMfaRecoveryLink,
    sendMagicLink,
    updatePassword,
    refreshProfile: () => loadProfile(session?.user?.id),
    mfaEnroll,
    mfaVerify,
    mfaUnenroll,
    mfaListFactors,
    refreshMfaStatus: () => refreshMfaStatus(session),
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
