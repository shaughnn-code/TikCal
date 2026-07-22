import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Inp, Btn, Kicker } from '../components/ui.jsx'

export default function Login() {
  const { signIn, user, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && profile) navigate(profile.setup_complete ? '/calendar' : '/setup', { replace: true })
  }, [user, profile, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { error } = await signIn(email, pw)
    setLoading(false)
    if (error) setErr(error)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <GridBg lite />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-12">
          <Logo size="md" framed />
          <p className="text-slate-600 text-sm mt-3 font-mono">your concert calendar</p>
        </div>
        <Kicker className="mb-3">// ACCESS</Kicker>
        <form onSubmit={submit} className="space-y-4">
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Inp label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required />
          {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
          <Btn type="submit" variant="ice" disabled={loading} cls="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Btn>
        </form>
        <p className="text-center text-slate-600 text-sm mt-4">
          <Link to="/forgot" className="text-violet hover:underline">Forgot password?</Link>
        </p>
        <p className="text-center text-slate-600 text-sm mt-2">
          No account?{' '}
          <Link to="/signup" className="text-violet hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
