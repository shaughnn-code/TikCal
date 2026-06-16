import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker } from '../components/ui.jsx'

export default function Signup() {
  const { signUp, user, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [conf, setConf] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && profile) navigate(profile.setup_complete ? '/calendar' : '/setup', { replace: true })
  }, [user, profile, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (pw !== conf) return setErr('Passwords do not match.')
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    setLoading(true)
    const { error, data } = await signUp(email, pw)
    setLoading(false)
    if (error) return setErr(error)
    if (!data?.session) setMsg('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-12">
          <Logo size="md" />
          <p className="text-slate-600 text-sm mt-3 font-mono">join your friends' calendar</p>
        </div>
        <Kicker className="mb-3">// NEW ACCOUNT</Kicker>
        <form onSubmit={submit} className="space-y-4">
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Inp label="Password" type="password" value={pw} onChange={setPw} placeholder="Min. 6 characters" required />
          <Inp label="Confirm Password" type="password" value={conf} onChange={setConf} placeholder="••••••••" required />
          {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
          {msg && <p className="text-mint text-xs text-center py-1">{msg}</p>}
          <Btn type="submit" variant="mint" disabled={loading} cls="w-full">
            {loading ? 'Creating account…' : 'Create account →'}
          </Btn>
        </form>
        <p className="text-center text-slate-600 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ice hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
