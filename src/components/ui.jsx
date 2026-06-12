// Shared design-token primitives, ported from the original prototype.

export const Inp = ({ label, type = 'text', value, onChange, placeholder, required, cls = '' }) => (
  <div className={cls}>
    {label && (
      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">{label}</label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-700 text-sm focus:outline-none focus:border-accent/60 transition-colors"
    />
  </div>
)

export const Txta = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    {label && (
      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">{label}</label>
    )}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-700 text-sm focus:outline-none focus:border-accent/60 transition-colors resize-none"
    />
  </div>
)

export const Sel = ({ label, value, onChange, options }) => (
  <div>
    {label && (
      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">{label}</label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/60 transition-colors appearance-none"
      style={{ color: value ? '#fff' : '#4b5563' }}
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

export const Btn = ({ children, onClick, type = 'button', variant = 'primary', disabled, cls = '' }) => {
  const styles = {
    primary: 'bg-accent hover:bg-[#5a9256] text-white',
    ghost: 'border border-white/10 hover:border-white/25 text-gray-300 hover:text-white',
    danger: 'border border-red-500/20 hover:border-red-400/40 text-red-400 hover:text-red-300',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${styles[variant]} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${cls}`}
    >
      {children}
    </button>
  )
}

export const Wrap = ({ children, cls = '' }) => (
  <div className={`max-w-2xl mx-auto px-4 py-8 ${cls}`}>{children}</div>
)

export const Logo = ({ cls = '' }) => (
  <span className={`logo-type text-accent ${cls}`}>TikCal</span>
)

export const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-gray-800 text-sm tracking-widest">···</div>
  </div>
)
