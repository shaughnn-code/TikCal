import { TOTEMS } from '../lib/constants.js'
import { Totem } from './icons.jsx'

// Totem picker — 20 full-color totems with a hover "vibe" card.
// `value`/`onChange` store the icon id (e.g. "noto:pill").
export const TotemSel = ({ value, onChange }) => (
  <div className="grid grid-cols-4 gap-2">
    {TOTEMS.map((t) => {
      const sel = value === t.icon
      return (
        <button
          key={t.icon}
          type="button"
          onClick={() => onChange(t.icon)}
          className={`group relative flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg border transition-all hover:-translate-y-0.5 ${
            sel
              ? 'border-mint bg-mint/10 shadow-[0_0_14px_rgba(110,231,183,0.2)]'
              : 'border-white/10 hover:border-ice/50'
          }`}
        >
          {/* vibe tooltip */}
          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-40 z-30 rounded-md border border-mint bg-[#0c141c] px-2.5 py-2 text-[10px] leading-snug text-[#e8f4f8] opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.7)] transition-opacity group-hover:opacity-100">
            {t.vibe}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-mint" />
          </span>
          <Totem icon={t.icon} size={26} />
          <span className="font-display font-bold text-[9px] text-center leading-tight text-[#e8f4f8]">
            {t.name}
          </span>
        </button>
      )
    })}
  </div>
)
