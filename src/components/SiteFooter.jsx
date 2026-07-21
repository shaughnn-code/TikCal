import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Each link carries its destination. `to` = in-app route (React Router);
// `href` = external/placeholder ('#' until final targets are set). Product
// points at real pages today; the rest are stubs to finalize with copy.
const COLUMNS = [
  {
    label: 'Product',
    links: [
      { label: 'Calendar', to: '/calendar' },
      { label: 'Discover', to: '/discover' },
      { label: 'Plan', to: '/plan' },
      { label: 'Overlap', to: '/overlap' },
    ],
  },
  {
    label: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', href: 'mailto:dev@tikcal.nyc' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { label: 'Help', to: '/help' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
  {
    label: 'Social',
    links: [
      { label: 'Instagram', href: '#' },
      { label: 'TikTok', href: '#' },
    ],
  },
]

const linkCls = 'text-[13px] text-muted hover:text-[#eef6f7] transition-colors'

// Columns fade/blur/rise in the first time they scroll into view, staggered.
// Fires once, then unobserves.
export default function SiteFooter() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return setShown(true)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.unobserve(el)
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const reveal = (i) => ({
    opacity: shown ? 1 : 0,
    filter: shown ? 'blur(0)' : 'blur(4px)',
    transform: shown ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity .7s ease, filter .7s ease, transform .7s ease',
    transitionDelay: `${i * 80}ms`,
  })

  return (
    <footer ref={ref} className="relative mt-16 border-t border-line pt-10 pb-12">
      <div className="absolute -top-px left-1/2 -translate-x-1/2 w-[200px] h-px
                      bg-gradient-to-r from-transparent via-violet to-transparent" />

      <div className="grid gap-[26px] grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div style={reveal(0)}>
          <div className="font-heading font-extrabold text-[19px] text-[#eef6f7]">TikCal</div>
          <p className="text-[13px] text-muted max-w-[220px] mt-2 leading-relaxed">
            Every source, one calendar. Track every show, see what your crew is hitting.
          </p>
          <p className="text-[11.5px] text-faint mt-4">© {new Date().getFullYear()} TikCal</p>
        </div>

        {COLUMNS.map((col, i) => (
          <div key={col.label} style={reveal(i + 1)}>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-faint mb-3">{col.label}</div>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className={linkCls}>{l.label}</Link>
                  ) : (
                    <a href={l.href} className={linkCls}>{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
