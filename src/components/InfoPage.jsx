import { Link } from 'react-router-dom'
import { GridBg, Logo } from './ui.jsx'

// Shared layout for static info/legal pages (About, Help, Privacy, Terms).
// Public + on-brand: aurora backdrop, wordmark home link, narrow prose column.
export default function InfoPage({ kicker, title, updated, children }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <GridBg lite />

      <header className="relative z-10 w-full max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" aria-label="TikCal home">
          <Logo size="sm" />
        </Link>
        <Link
          to="/"
          className="font-mono text-xs text-slate-400 hover:text-white focus-visible:text-white transition-colors"
        >
          ← HOME
        </Link>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-6 pt-6 pb-16">
        {kicker && (
          <div className="font-mono text-[11px] tracking-[0.18em] text-violet mb-3">{kicker}</div>
        )}
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
          {title}
        </h1>
        {updated && <p className="font-mono text-[11px] text-faint mt-3">{updated}</p>}
        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-slate-300">{children}</div>
      </main>
    </div>
  )
}

// Small building blocks so page bodies read cleanly.
export const H2 = ({ children }) => (
  <h2 className="font-heading font-bold text-white text-lg mt-10 first:mt-0">{children}</h2>
)

export const Note = ({ children }) => (
  <p className="rounded-xl border border-violet/25 bg-violet/[0.06] px-4 py-3 text-[13px] text-slate-300">
    {children}
  </p>
)
