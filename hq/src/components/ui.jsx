// Small shared UI pieces so every feature looks like the same app.
import { useEffect } from 'react'
import { Icon } from './icons.jsx'

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-mut">
      <Icon name={icon} size={32} className="opacity-50" />
      <div className="font-medium text-fg/80">{title}</div>
      {hint && <div className="max-w-xs text-sm">{hint}</div>}
    </div>
  )
}

export function Chip({ color = 'bg-panel2 text-mut', children, className = '', ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] ${color} ${className}`}
      {...rest}
    >
      {children}
    </span>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      {children}
    </label>
  )
}

export const STATUS = {
  todo: { label: 'To do', chip: 'bg-panel2 text-mut', dot: 'bg-mut' },
  doing: { label: 'Doing', chip: 'bg-blue/15 text-blue', dot: 'bg-blue' },
  done: { label: 'Done', chip: 'bg-green/15 text-green', dot: 'bg-green' },
}
