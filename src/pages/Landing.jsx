import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { GridBg, Logo, Btn, HudBox } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

export default function Landing() {
  const { user, profile } = useAuth()
  const loggedIn = !!user
  const primaryTo = loggedIn ? (profile?.setup_complete ? '/calendar' : '/setup') : '/signup'

  const features = [
    { icon: 'calendar-dots', title: 'One calendar', body: 'Every show you and your crew are hitting, in one place.' },
    { icon: 'users-three', title: 'Friends + crews', body: 'Follow friends, join invite-only crews for instant density.' },
    { icon: 'sparkle', title: 'Smart Add', body: 'Drop a ticket link, text, or screenshot — it fills itself in.' },
  ]

  return (
    <div className="relative min-h-screen flex flex-col">
      <GridBg />
      <header className="relative z-10 px-5 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Logo size="sm" />
        <div className="flex items-center gap-4 text-sm">
          {loggedIn ? (
            <Link to={primaryTo} className="font-mono text-xs text-slate-300 hover:text-white transition-colors">
              OPEN APP →
            </Link>
          ) : (
            <>
              <Link to="/login" className="font-mono text-xs text-slate-400 hover:text-white transition-colors">
                SIGN IN
              </Link>
              <Link
                to="/signup"
                className="font-mono text-xs font-bold bg-gradient-to-r from-aurora to-violet text-white px-4 py-2 rounded-lg shadow-[0_6px_18px_-6px_rgba(192,75,255,0.6)] hover:brightness-110 transition-[filter]"
              >
                GET STARTED
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <div className="text-5xl mb-5">🎫</div>
        <Logo size="lg" framed className="mb-5" />
        <div className="font-mono text-xs text-violet tracking-[0.18em] mb-3">EVERY SOURCE · ONE CALENDAR</div>
        <p className="text-slate-400 text-base max-w-md mb-9 leading-relaxed">
          Track every show, see what your crew is hitting, and never miss a night out.
        </p>
        <div className="flex items-center gap-3 mb-16">
          <Link to={primaryTo}>
            <Btn variant="aurora" cls="!px-7 !py-3.5">
              {loggedIn ? 'Open calendar →' : 'Start your calendar →'}
            </Btn>
          </Link>
          {!loggedIn && (
            <Link to="/login">
              <Btn variant="ghost" cls="!px-7 !py-3.5">Sign in</Btn>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
          {features.map((f) => (
            <HudBox key={f.title} className="p-5 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="w-9 h-9 rounded-lg grid place-items-center mb-3 bg-violet/12 ring-1 ring-violet/25">
                <Icon name={f.icon} size={20} className="text-violet" />
              </div>
              <h3 className="font-heading font-bold text-white text-base mb-1">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.body}</p>
            </HudBox>
          ))}
        </div>
      </main>

      <footer className="relative z-10 text-center text-slate-600 font-mono text-[10px] py-8">
        TIKCAL · MADE FOR NIGHTS OUT IN NYC
      </footer>
    </div>
  )
}
