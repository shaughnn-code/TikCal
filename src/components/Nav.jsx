import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Logo } from './ui.jsx'
import { Icon, Totem } from './icons.jsx'

export const Nav = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const link = (to, icon, label) => (
    <NavLink to={to}>
      {({ isActive }) => (
        <span
          className={`flex items-center gap-1.5 font-mono text-[10px] tracking-wide uppercase transition-colors ${
            isActive ? 'text-ice' : 'text-slate-500 hover:text-white'
          }`}
        >
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-mint shadow-[0_0_8px_#6EE7B7]" />}
          <Icon name={icon} size={14} />
          {label}
        </span>
      )}
    </NavLink>
  )

  return (
    <nav className="relative z-20 border-b border-white/[0.07] px-4 py-4 sticky top-0 bg-ink/80 backdrop-blur">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate('/calendar')}>
          <Logo size="sm" />
        </button>
        <div className="flex items-center gap-5">
          {link('/calendar', 'calendar-dots', 'Cal')}
          {link('/friends', 'users-three', 'Crew')}
          <NavLink to="/profile">
            {({ isActive }) => (
              <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${isActive ? 'text-ice' : 'text-slate-500 hover:text-white'}`}>
                {profile?.totem ? <Totem icon={profile.totem} size={16} /> : <Icon name="user" size={14} />}
                You
              </span>
            )}
          </NavLink>
          <button
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            className="text-slate-600 hover:text-white transition-colors"
            title="Sign out"
          >
            <Icon name="sign-out" size={15} />
          </button>
        </div>
      </div>
    </nav>
  )
}
