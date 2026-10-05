import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Logo } from './ui.jsx'
import { Icon, Totem } from './icons.jsx'

// One nav item, rendered once and laid out two ways so Tour's
// `[data-tour=...]` selectors always hit the visible element:
// - under `sm` it is a bottom-tab-bar cell: icon in a pill over an 11px label;
// - from `sm` up it is the inline top-bar pill with the label beside the icon.
// Every active state uses the same aurora→violet chrome (DESIGN.md Chrome-Only
// Rule). Per-tab rainbow hues would compete with the crew/RSVP data hues.
const ACTIVE_FILL = 'linear-gradient(135deg,#c04bff,#8b5cff)'
const NavItem = ({ to, label, children, dataTour }) => (
  <NavLink to={to} className="flex-1 sm:flex-none shrink-0 outline-none" data-tour={dataTour} aria-label={label}>
    {({ isActive }) => (
      <span className="group relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 sm:rounded-full sm:px-3.5 sm:py-2 font-mono text-[11px] sm:text-[14px] tracking-wide uppercase">
        {/* desktop: whole pill fills */}
        <span
          className={`hidden sm:block absolute inset-0 rounded-full transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
          style={{ background: ACTIVE_FILL }}
        />
        {/* mobile: only the icon pill fills */}
        <span
          className={`relative z-10 isolate flex items-center justify-center w-[46px] h-8 sm:w-auto sm:h-auto rounded-full transition-colors duration-300 ${
            isActive ? 'text-white' : 'text-slate-400 sm:text-slate-300 group-hover:text-white'
          }`}
        >
          {isActive && <span className="sm:hidden absolute inset-0 -z-10 rounded-full shadow-[0_6px_18px_-6px_rgba(192,75,255,.8)]" style={{ background: ACTIVE_FILL }} />}
          {children}
        </span>
        <span
          className={`relative z-10 transition-colors duration-300 ${
            isActive ? 'text-[#d9c9ff] sm:text-white' : 'text-slate-400 sm:text-slate-300 group-hover:text-white'
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
    // `sticky top-0` parks the bar at the very top of the viewport, which under
    // viewport-fit=cover is *behind* the notch / Dynamic Island. The top inset
    // is added to its padding rather than offsetting it, so the translucent bar
    // paints under the status bar instead of leaving a hole. Because the nav is
    // sticky (in flow, not fixed), the taller bar pushes page content down on
    // its own — nothing else needs to know its height. Side insets keep it clear
    // of the rounded corners in landscape. All four are 0px on the web.
    // backdrop-blur is sm-only: a backdrop-filter makes the nav the containing
    // block for `fixed` children, which would trap the mobile tab bar inside it.
    <nav className="relative z-20 border-b border-white/[0.07] px-4 py-4 pt-[calc(1rem+var(--sat))] pr-[calc(1rem+var(--sar))] pl-[calc(1rem+var(--sal))] sticky top-0 bg-ink/95 sm:bg-ink/80 sm:backdrop-blur">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 min-w-0">
        <button onClick={() => navigate('/calendar')} className="shrink-0" aria-label="TikCal home">
          <Logo size="md" framed />
        </button>
        {/* Under `sm` this row is the fixed bottom tab bar (padded clear of the
            home indicator; hidden while typing so it can't ride the keyboard).
            From `sm` up it sits inline in the top bar. min-w-0 on both the row
            and the scroller: flex children default to min-width:auto, which
            refused to shrink and forced the whole page to overflow on phones. */}
        <div className="tabbar fixed inset-x-0 bottom-0 z-30 flex items-start justify-between px-2 pt-2.5 pb-[calc(0.75rem+var(--sab))] pl-[calc(0.5rem+var(--sal))] pr-[calc(0.5rem+var(--sar))] bg-ink/95 border-t border-white/[0.06] sm:static sm:z-auto sm:p-0 sm:bg-transparent sm:border-0 sm:ml-auto sm:items-center sm:justify-end sm:gap-2 min-w-0 sm:overflow-x-auto no-scrollbar">
          <NavItem to="/calendar" label="Cal" dataTour="nav-calendar"><Icon name="calendar-dots" size={22} /></NavItem>
          <NavItem to="/discover" label="Find" dataTour="nav-discover"><Icon name="compass" size={22} /></NavItem>
          <NavItem to="/plan" label="Plan"><Icon name="magic-wand" size={22} /></NavItem>
          <NavItem to="/friends" label="Crew"><Icon name="users-three" size={22} /></NavItem>
          <NavItem to="/overlap" label="Sync" dataTour="nav-overlap"><Icon name="intersect" size={22} /></NavItem>
          <NavItem to="/profile" label="You" dataTour="nav-profile">
            {profile?.totem ? <Totem icon={profile.totem} size={24} /> : <Icon name="user" size={22} />}
          </NavItem>
        </div>
        {/* Sign out stays in the top bar at every size — the bottom bar holds
            exactly the six destinations. */}
        <button
          onClick={async () => {
            await signOut()
            navigate('/login')
          }}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Sign out"
          aria-label="Sign out"
        >
          <Icon name="sign-out" size={22} />
        </button>
      </div>
    </nav>
  )
}
