import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker, Spinner } from '../components/ui.jsx'

// Landing page for the password-reset email link. Supabase establishes a
// recovery session from the URL automatically; here the user sets a new password.
export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [conf, setConf] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (loading) return <Spinner />

  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    if (pw !== conf) return setErr('Passwords do not match.')
    setBusy(true); setErr('')
    const r = await updatePassword(pw)
    setBusy(false)
    if (r.error) return setErr(r.error)
    setDone(true)
    setTimeout(() => navigate('/calendar', { replace: true }), 1000)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo size="md" framed />
        </div>
        <Kicker className="mb-3">// SET NEW PASSWORD</Kicker>

        {!user ? (
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">This reset link is invalid or has expired.</p>
            <Link to="/forgot" className="text-violet hover:underline text-sm">Request a new one →</Link>
          </div>
        ) : done ? (
          <p className="text-mint text-sm text-center py-4">✓ Password updated — signing you in…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Inp label="New password" type="password" value={pw} onChange={setPw} placeholder="Min. 6 characters" required />
            <Inp label="Confirm password" type="password" value={conf} onChange={setConf} placeholder="••••••••" required />
            {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
            <Btn type="submit" variant="mint" disabled={busy} cls="w-full">
              {busy ? 'Updating…' : 'Update password'}
            </Btn>
          </form>
        )}
      </div>
    </div>
  )
}
