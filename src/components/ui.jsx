// Shared design-token primitives for the "Wide Ice" system.

export const Logo = ({ size = 'md', className = '' }) => {
  const cls = size === 'lg' ? 'logo-3d text-[56px]' : size === 'sm' ? 'logo-3d-sm text-[20px]' : 'logo-3d-sm text-[30px]'
  return <span className={`${cls} ${className}`}>TikCal</span>
}

// Atmospheric Tron grid background — fixed, full-viewport, behind everything.
// `lite` dims + lowers it behind dense content.
export const GridBg = ({ lite = false, glow = true }) => (
  <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none ${lite ? 'grid-lite' : ''}`}>
    {glow && <div className="grid-glow" />}
    <div className="grid-floor" />
    <div className="grid-horizon" />
    <div className="scanlines" />
  </div>
)

// Soft elevated panel — the Aurora system's surface. Dark, rounded, hairline
// border with a faint violet edge-light up top. `hero` lifts it with an aurora
// wash; `brackets` opts back into the legacy HUD corner marks (violet now).
export const HudBox = ({ children, className = '', tone = 'violet', hero = false, brackets = false, ...rest }) => {
  const hudColor = tone === 'mint' ? '#6EE7B7' : tone === 'ice' ? '#4cc9f0' : '#8b5cff'
  const base = hero
    ? 'border-violet/30 bg-violet/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_-12px_rgba(139,92,255,0.35)]'
    : 'border-white/[0.07] bg-panel/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_30px_-16px_rgba(0,0,0,0.8)]'
  return (
    <div
      className={`${brackets ? 'hud' : ''} relative rounded-2xl border backdrop-blur-sm ${base} ${className}`}
      style={{ '--hud-color': hudColor }}
      {...rest}
    >
      {children}
    </div>
  )
}

// mono section label, e.g. "▸ Upcoming"
export const SecLabel = ({ children, className = '', ...rest }) => (
  <span className={`block font-mono text-[11px] tracking-[0.14em] uppercase text-slate-400 ${className}`} {...rest}>
    {children}
  </span>
)

export const Kicker = ({ children, className = '' }) => (
  <div className={`font-mono text-[11px] tracking-[0.16em] text-violet ${className}`}>{children}</div>
)

export const Inp = ({ label, type = 'text', value, onChange, placeholder, required, cls = '' }) => (
  <div className={cls}>
    {label && <SecLabel className="mb-2">{label}</SecLabel>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] placeholder-slate-600 text-sm focus:outline-none focus:border-violet/60 transition-colors"
    />
  </div>
)

export const Txta = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    {label && <SecLabel className="mb-2">{label}</SecLabel>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] placeholder-slate-600 text-sm focus:outline-none focus:border-violet/60 transition-colors resize-none"
    />
  </div>
)

export const Sel = ({ label, value, onChange, options }) => (
  <div>
    {label && <SecLabel className="mb-2">{label}</SecLabel>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0d141b] border border-white/10 rounded px-3 py-3 text-sm focus:outline-none focus:border-violet/60 transition-colors appearance-none"
      style={{ color: value ? '#e8f4f8' : '#475569' }}
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
)

export const Btn = ({ children, onClick, type = 'button', variant = 'mint', disabled, cls = '' }) => {
  const styles = {
    aurora:
      'text-white bg-gradient-to-r from-aurora to-violet shadow-[0_8px_24px_-8px_rgba(192,75,255,0.6)] hover:brightness-110',
    mint: 'bg-mint hover:brightness-110 text-[#04221a]',
    ice: 'bg-violet hover:brightness-110 text-white',
    ghost: 'border border-white/10 hover:border-white/25 text-slate-300 hover:text-white',
    danger: 'border border-red-500/25 hover:border-red-400/40 text-red-400 hover:text-red-300',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-3 rounded font-mono font-bold text-xs tracking-[0.06em] uppercase transition-all inline-flex items-center justify-center gap-1.5 ${styles[variant]} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${cls}`}
    >
      {children}
    </button>
  )
}

// `wide` opts into the calendar-zoom layout, which needs room for the 200px
// rail beside a 7-column grid. Everything else stays on the mobile-first width.
export const Wrap = ({ children, cls = '', wide = false }) => (
  <div className={`relative z-10 ${wide ? 'max-w-6xl' : 'max-w-2xl'} mx-auto px-4 py-8 ${cls}`}>{children}</div>
)

export const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="font-mono text-violet/40 text-sm tracking-[0.3em]">···</div>
  </div>
)
