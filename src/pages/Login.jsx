import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Inp, Btn } from '../components/ui.jsx'

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🎫</div>
          <h1 className="logo-type text-4xl text-accent mb-2">TikCal</h1>
          <p className="text-gray-600 text-sm">Your concert calendar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Inp label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required />
          {err && <p className="text-red-400 text-xs text-center py-1">{err}</p>}
          <Btn type="submit" disabled={loading} cls="w-full flex justify-center">
            {loading ? 'Signing in…' : 'Sign in'}
          </Btn>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          No account?{' '}
          <Link to="/signup" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
