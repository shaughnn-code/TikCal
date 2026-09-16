import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker, Spinner } from '../components/ui.jsx'

// Login-time TOTP challenge. Reached by App.jsx's MfaChallengeGate whenever
// mfaStatus === 'needs-challenge' — enrolled, but this session hasn't proven
// the second factor yet. No bypass path.
export default function MfaChallenge() {
  const { user, mfaListFactors, mfaVerify, sendMfaRecoveryLink, signOut } = useAuth()
  const navigate = useNavigate()
  const [factorId, setFactorId] = useState(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryBusy, setRecoveryBusy] = useState(false)

  useEffect(() => {
    let active = true
    mfaListFactors().then(({ data, error }) => {
      if (!active) return
      if (error) return setLoadErr(error.message)
      const verified = (data?.totp || []).find((f) => f.status === 'verified')
      if (!verified) return setLoadErr('No verified authenticator found.')
      setFactorId(verified.id)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await mfaVerify(factorId, code)
    setBusy(false)
    if (error) return setErr(error)
    navigate('/', { replace: true })
  }

  const sendRecovery = async () => {
    setRecoveryBusy(true)
    const { error } = await sendMfaRecoveryLink(user.email)
    setRecoveryBusy(false)
    if (error) return setErr(error)
    setRecoverySent(true)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="md" framed />
        </div>
        <Kicker className="mb-3">// TWO-FACTOR CODE</Kicker>
        <p className="text-slate-600 text-sm mb-6">Enter the 6-digit code from your authenticator app.</p>

        {loadErr && <p className="text-red-400 text-xs text-center py-1">{loadErr}</p>}

        {!factorId && !loadErr ? (
          <Spinner />
        ) : (
          factorId && (
            <form onSubmit={submit} className="space-y-4">
              <Inp label="6-digit code" type="text" value={code} onChange={setCode} placeholder="123456" required />
              {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
              <Btn type="submit" variant="ice" disabled={busy} cls="w-full">
                {busy ? 'Verifying…' : 'Verify'}
              </Btn>
            </form>
          )
        )}

        {recoverySent ? (
          <p className="text-mint text-xs text-center mt-6">Check your email for a recovery link.</p>
        ) : (
          <button
            type="button"
            onClick={sendRecovery}
            disabled={recoveryBusy}
            className="block w-full text-center text-slate-600 text-sm mt-6 hover:underline"
          >
            {recoveryBusy ? 'Sending…' : 'Lost your authenticator?'}
          </button>
        )}

        <button
          type="button"
          onClick={signOut}
          className="block w-full text-center text-slate-600 text-sm mt-3 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
