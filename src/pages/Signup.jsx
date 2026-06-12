import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Inp, Btn } from '../components/ui.jsx'

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
    // If email confirmation is required, no session is returned.
    if (!data?.session) {
      setMsg('Check your email to confirm your account, then sign in.')
    }
    // Otherwise the effect above redirects to /setup once the profile loads.
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🎫</div>
          <h1 className="logo-type text-4xl text-accent mb-2">TikCal</h1>
          <p className="text-gray-600 text-sm">Join your friends' concert calendar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Inp label="Password" type="password" value={pw} onChange={setPw} placeholder="Min. 6 characters" required />
          <Inp label="Confirm Password" type="password" value={conf} onChange={setConf} placeholder="••••••••" required />
          {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
          {msg && <p className="text-accent text-xs text-center py-1">{msg}</p>}
          <Btn type="submit" disabled={loading} cls="w-full flex justify-center">
            {loading ? 'Creating account…' : 'Create account'}
          </Btn>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
