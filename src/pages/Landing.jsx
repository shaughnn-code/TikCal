import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

export default function Landing() {
  const { user, profile } = useAuth()
  const loggedIn = !!user
  const primaryTo = loggedIn ? (profile?.setup_complete ? '/calendar' : '/setup') : '/signup'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="px-5 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="logo-type text-accent text-2xl">TikCal</span>
        <div className="flex items-center gap-4 text-sm">
          {loggedIn ? (
            <Link to={primaryTo} className="text-gray-300 hover:text-white transition-colors">
              Open app →
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="bg-accent hover:bg-[#5a9256] text-white px-4 py-2 rounded-xl transition-colors"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <div className="text-6xl mb-6">🎫</div>
        <h1 className="heading-type text-4xl sm:text-6xl leading-[1.05] text-white mb-5">
          Your crew's
          <br />
          <span className="text-accent">concert calendar</span>
        </h1>
        <p className="text-gray-400 text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Track every show, see what your friends are going to, and never miss a night out.
          Add your crews and your calendar fills itself.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to={primaryTo}
            className="bg-accent hover:bg-[#5a9256] text-white px-7 py-3.5 rounded-2xl font-medium transition-colors"
          >
            {loggedIn ? 'Open your calendar' : 'Start your calendar'}
          </Link>
          {!loggedIn && (
            <Link
              to="/login"
              className="border border-white/10 hover:border-white/25 text-gray-300 hover:text-white px-7 py-3.5 rounded-2xl font-medium transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-16 w-full text-left">
          {[
            { icon: '🗓', title: 'One calendar', body: 'Every show you and your crew are hitting, in one place.' },
            { icon: '👯', title: 'Friends + crews', body: 'Follow friends and join invite-only crews for instant density.' },
            { icon: '📸', title: 'Flyers & notes', body: 'Save the flyer, set times, drop notes for the door.' },
          ].map((f) => (
            <div key={f.title} className="border border-white/[0.08] rounded-2xl p-5">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="heading-type text-white text-base mb-1">{f.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-gray-700 text-xs py-8">
        TikCal · made for nights out in NYC
      </footer>
    </div>
  )
}
