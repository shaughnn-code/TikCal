import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Logo } from './ui.jsx'
import { Icon, Totem } from './icons.jsx'

// Gradient "light up + expand" nav item. On hover — and while it's the active
// route — the pill fills with the aurora gradient, lifts a blurred glow behind
// it, and scales up, so the destination you're heading to is unmistakable.
// (One brand gradient for every item: nav is chrome, and per-item colors would
// clash with the app's color-as-information system.)
const GRAD = 'linear-gradient(45deg,#a955ff,#ea51ff)'

const NavItem = ({ to, label, children }) => (
  <NavLink to={to} className="shrink-0 outline-none">
    {({ isActive }) => (
      <span
        className={`group relative flex items-center gap-2 rounded-full px-3.5 py-2 font-mono text-[14px] tracking-wide uppercase transition-transform duration-300 ${
          isActive ? 'scale-105' : 'hover:scale-105'
        }`}
      >
        {/* gradient fill */}
        <span
          className={`absolute inset-0 rounded-full transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
          style={{ background: GRAD }}
        />
        {/* blurred glow behind */}
        <span
          className={`absolute inset-0 rounded-full blur-[14px] -z-10 transition-opacity duration-300 ${
            isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-50 group-focus-visible:opacity-50'
          }`}
          style={{ background: GRAD }}
        />
        <span
          className={`relative z-10 flex items-center transition-colors duration-300 ${
            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
          }`}
        >
          {children}
        </span>
        <span
          className={`relative z-10 hidden sm:inline transition-colors duration-300 ${
            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
          }`}
        >
          {label}
        </span>
      </span>
    )}
  </NavLink>
)

export const Nav = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="relative z-20 border-b border-white/[0.07] px-4 py-4 sticky top-0 bg-ink/80 backdrop-blur">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <button onClick={() => navigate('/calendar')} className="shrink-0" aria-label="TikCal home">
          <Logo size="md" />
        </button>
        <div className="flex items-center gap-1 sm:gap-2">
          <NavItem to="/calendar" label="Cal"><Icon name="calendar-dots" size={21} /></NavItem>
          <NavItem to="/discover" label="Find"><Icon name="compass" size={21} /></NavItem>
          <NavItem to="/plan" label="Plan"><Icon name="magic-wand" size={21} /></NavItem>
          <NavItem to="/friends" label="Crew"><Icon name="users-three" size={21} /></NavItem>
          <NavItem to="/overlap" label="Sync"><Icon name="intersect" size={21} /></NavItem>
          <NavItem to="/profile" label="You">
            {profile?.totem ? <Totem icon={profile.totem} size={24} /> : <Icon name="user" size={21} />}
          </NavItem>
          <button
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            className="shrink-0 ml-1 w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="sign-out" size={22} />
          </button>
        </div>
      </div>
    </nav>
  )
}
