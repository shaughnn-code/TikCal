import { TOTEMS } from '../lib/constants.js'

export const TotemSel = ({ value, onChange }) => (
  <div className="grid grid-cols-4 gap-2">
    {TOTEMS.map((t) => (
      <button
        key={t.emoji}
        type="button"
        onClick={() => onChange(t.emoji)}
        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all ${
          value === t.emoji ? 'border-accent bg-accent/10' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <span className="text-xl leading-none">{t.emoji}</span>
        <span className="text-[8px] text-gray-500 text-center leading-tight">{t.label}</span>
      </button>
    ))}
  </div>
)
