import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Logo } from './ui.jsx'

export const Nav = () => {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const linkCls = ({ isActive }) =>
    `text-sm transition-colors ${isActive ? 'text-accent' : 'text-gray-500 hover:text-white'}`

  return (
    <nav className="border-b border-white/[0.07] px-4 py-4 sticky top-0 z-20 bg-ink/80 backdrop-blur">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate('/calendar')} className="text-lg">
          <Logo />
        </button>
        <div className="flex items-center gap-5">
          <NavLink to="/calendar" className={linkCls}>
            Calendar
          </NavLink>
          <NavLink to="/friends" className={linkCls}>
            Crew
          </NavLink>
          <NavLink to="/profile" className={linkCls}>
            {({ isActive }) => (
              <span className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                    isActive ? 'bg-accent/20 border-accent/50' : 'bg-white/5 border-white/20'
                  }`}
                >
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-accent' : 'text-gray-400'}`}>
                    {initials}
                  </span>
                </span>
                Profile
              </span>
            )}
          </NavLink>
          <button
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            className="text-sm text-gray-600 hover:text-white transition-colors"
          >
            Out
          </button>
        </div>
      </div>
    </nav>
  )
}
