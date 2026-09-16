import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker, Spinner } from '../components/ui.jsx'

// Mandatory TOTP enrollment. Reached by App.jsx's MfaEnrollGate whenever
// mfaStatus === 'needs-enrollment' — there is no way to skip or dismiss this.
export default function MfaEnroll() {
  const { mfaEnroll, mfaVerify, signOut } = useAuth()
  const navigate = useNavigate()
  const [factor, setFactor] = useState(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    let active = true
    mfaEnroll().then(({ data, error }) => {
      if (!active) return
      if (error) return setLoadErr(error.message)
      setFactor(data)
    })
    return () => {
      active = false
    }
    // Enroll exactly once per mount; re-running would create a duplicate factor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await mfaVerify(factor.id, code)
    setBusy(false)
    if (error) return setErr(error)
    navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size="md" framed />
        </div>
        <Kicker className="mb-3">// SET UP TWO-FACTOR AUTHENTICATION</Kicker>
        <p className="text-slate-600 text-sm mb-6">
          TikCal requires an authenticator app (Google Authenticator, 1Password, Authy, etc.) on every account.
        </p>

        {loadErr && <p className="text-red-400 text-xs text-center py-1">{loadErr}</p>}

        {!factor ? (
          <Spinner />
        ) : (
          <>
            <div className="bg-white rounded-lg p-4 mb-4 flex justify-center">
              {/* Supabase returns qr_code as an <img>-ready data URI, per its own docs. */}
              <img src={factor.totp.qr_code} alt={factor.totp.uri} className="w-48 h-48" />
            </div>
            <p className="text-slate-600 text-xs text-center mb-1">Can't scan? Enter this key manually:</p>
            <p className="font-mono text-xs text-center break-all mb-6 text-slate-400">{factor.totp.secret}</p>

            <form onSubmit={submit} className="space-y-4">
              <Inp label="6-digit code" type="text" value={code} onChange={setCode} placeholder="123456" required />
              {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
              <Btn type="submit" variant="mint" disabled={busy} cls="w-full">
                {busy ? 'Verifying…' : 'Verify and continue →'}
              </Btn>
            </form>
          </>
        )}

        <button
          type="button"
          onClick={signOut}
          className="block w-full text-center text-slate-600 text-sm mt-6 hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
