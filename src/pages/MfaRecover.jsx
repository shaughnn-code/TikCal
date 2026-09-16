import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Btn, Kicker, Spinner } from '../components/ui.jsx'

// Landing page for the MFA-recovery email link (sendMfaRecoveryLink). Not
// wrapped by any MFA gate, on purpose: proving email ownership via this link
// is the second channel that lets a user remove a TOTP factor they can no
// longer reach, without which they'd be locked out for good.
export default function MfaRecover() {
  const { user, loading, mfaListFactors, mfaUnenroll } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (loading) return <Spinner />

  const removeAndReenroll = async () => {
    setBusy(true)
    setErr('')
    const { data, error } = await mfaListFactors()
    if (error) {
      setBusy(false)
      return setErr(error.message)
    }
    const factors = data?.totp || []
    for (const factor of factors) {
      const result = await mfaUnenroll(factor.id)
      if (result.error) {
        setBusy(false)
        return setErr(result.error)
      }
    }
    setBusy(false)
    navigate('/mfa-enroll', { replace: true })
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo size="md" framed />
        </div>
        <Kicker className="mb-3">// RECOVER TWO-FACTOR AUTHENTICATION</Kicker>

        {!user ? (
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">This recovery link is invalid or has expired.</p>
            <Link to="/login" className="text-violet hover:underline text-sm">Back to sign in →</Link>
          </div>
        ) : (
          <>
            <p className="text-slate-600 text-sm mb-6">
              This removes your current authenticator and lets you set up a new one. Only do this if you no longer
              have access to your old authenticator app.
            </p>
            {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
            <Btn onClick={removeAndReenroll} disabled={busy} variant="mint" cls="w-full">
              {busy ? 'Removing…' : 'Remove old authenticator and set up a new one'}
            </Btn>
          </>
        )}
      </div>
    </div>
  )
}
