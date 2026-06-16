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

// HUD box with corner brackets. tone sets bracket color; hero adds emphasis.
export const HudBox = ({ children, className = '', tone = 'ice', hero = false, ...rest }) => {
  const hudColor = tone === 'mint' ? '#6EE7B7' : '#4cc9f0'
  const base = hero
    ? 'border-ice/40 bg-ice/[0.06] shadow-[inset_0_0_26px_rgba(76,201,240,0.07)]'
    : 'border-ice/25 bg-white/[0.025]'
  return (
    <div className={`hud relative rounded ${base} ${className}`} style={{ '--hud-color': hudColor }} {...rest}>
      {children}
    </div>
  )
}

// mono section label, e.g. "▸ Upcoming"
export const SecLabel = ({ children, className = '' }) => (
  <span className={`block font-mono text-[9px] tracking-[0.14em] uppercase text-slate-500 ${className}`}>
    {children}
  </span>
)

export const Kicker = ({ children, className = '' }) => (
  <div className={`font-mono text-[9px] tracking-[0.16em] text-ice ${className}`}>{children}</div>
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
      className="w-full bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] placeholder-slate-600 text-sm focus:outline-none focus:border-ice/60 transition-colors"
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
      className="w-full bg-white/[0.045] border border-white/10 rounded px-3 py-3 text-[#e8f4f8] placeholder-slate-600 text-sm focus:outline-none focus:border-ice/60 transition-colors resize-none"
    />
  </div>
)

export const Sel = ({ label, value, onChange, options }) => (
  <div>
    {label && <SecLabel className="mb-2">{label}</SecLabel>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0d141b] border border-white/10 rounded px-3 py-3 text-sm focus:outline-none focus:border-ice/60 transition-colors appearance-none"
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
    mint: 'bg-mint hover:brightness-110 text-[#04221a]',
    ice: 'bg-ice hover:brightness-110 text-[#042029]',
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

export const Wrap = ({ children, cls = '' }) => (
  <div className={`relative z-10 max-w-2xl mx-auto px-4 py-8 ${cls}`}>{children}</div>
)

export const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="font-mono text-ice/40 text-sm tracking-[0.3em]">···</div>
  </div>
)
