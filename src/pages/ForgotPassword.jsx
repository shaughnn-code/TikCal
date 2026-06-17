import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker } from '../components/ui.jsx'

export default function ForgotPassword() {
  const { resetPassword, sendMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')

  const doReset = async (e) => {
    e.preventDefault()
    if (!email) return setErr('Enter your email.')
    setBusy('reset'); setErr(''); setMsg('')
    const r = await resetPassword(email)
    setBusy('')
    r.error ? setErr(r.error) : setMsg('Check your email for a password-reset link.')
  }
  const doMagic = async () => {
    if (!email) return setErr('Enter your email first.')
    setBusy('magic'); setErr(''); setMsg('')
    const r = await sendMagicLink(email)
    setBusy('')
    r.error ? setErr(r.error) : setMsg('Check your email for a one-time sign-in link.')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo size="md" />
          <p className="text-slate-600 text-sm mt-3 font-mono">account recovery</p>
        </div>
        <Kicker className="mb-3">// RECOVER ACCESS</Kicker>
        <form onSubmit={doReset} className="space-y-4">
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
          {msg && <p className="text-mint text-xs text-center py-1">{msg}</p>}
          <Btn type="submit" variant="ice" disabled={busy === 'reset'} cls="w-full">
            {busy === 'reset' ? 'Sending…' : 'Send password-reset link'}
          </Btn>
        </form>

        <div className="flex items-center gap-3 my-5 text-slate-700">
          <div className="flex-1 h-px bg-white/10" />
          <span className="font-mono text-[9px] tracking-widest">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <Btn variant="ghost" onClick={doMagic} disabled={busy === 'magic'} cls="w-full">
          {busy === 'magic' ? 'Sending…' : 'Email me a one-time sign-in link'}
        </Btn>

        <p className="text-center text-slate-600 text-sm mt-6">
          <Link to="/login" className="text-ice hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
