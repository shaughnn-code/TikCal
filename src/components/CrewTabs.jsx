import { NavLink } from 'react-router-dom'

// Sub-navigation shared by the three pages that live under the Crew tab.
// Plan and Sync are still experimental, so they carry a BETA tag here instead
// of holding their own slots in the main tab bar.
const TABS = [
  { to: '/friends', label: 'Crew' },
  { to: '/plan', label: 'Plan', beta: true },
  { to: '/overlap', label: 'Sync', beta: true, dataTour: 'crew-sync' },
]

export const CrewTabs = () => (
  <div className="flex gap-1 mb-6 bg-white/[0.04] rounded p-1" role="tablist" aria-label="Crew sections">
    {TABS.map((t) => (
      <NavLink
        key={t.to}
        to={t.to}
        data-tour={t.dataTour}
        className={({ isActive }) =>
          `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded font-mono text-[11px] uppercase tracking-wide transition-all ${
            isActive ? 'bg-white/10 text-violet' : 'text-slate-500 hover:text-slate-300'
          }`
        }
      >
        {t.label}
        {t.beta && (
          <span className="rounded-sm border border-mint/40 px-1 text-[11px] leading-[14px] tracking-normal text-mint">Beta</span>
        )}
      </NavLink>
    ))}
  </div>
)
