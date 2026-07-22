// Inline SVG icon set (stroke style). Fully local — no icon fonts, no CDN.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M7 7h10v10H7z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  board: 'M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z',
  list: 'M9 6h12M9 12h12M9 18h12M4 6h.5M4 12h.5M4 18h.5',
  note: 'M6 3h9l4 4v14H6zM15 3v5h4',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2M9.5 2h5',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  link: 'M10 14L14 10M8 12l-3 3a3.5 3.5 0 005 5l3-3M16 12l3-3a3.5 3.5 0 00-5-5l-3 3',
  pencil: 'M4 20l1.2-4.2L16 5l3 3L8.2 18.8 4 20zM13.5 7.5l3 3',
  chevL: 'M15 6l-6 6 6 6',
  chevR: 'M9 6l6 6-6 6',
  tag: 'M4 4h7l9 9-7 7-9-9zM8.5 8.5h.01',
  arrowR: 'M4 12h16M13 5l7 7-7 7',
}

const FILLED = new Set(['play', 'stop'])

export function Icon({ name, size = 18, className = '' }) {
  const filled = FILLED.has(name)
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={PATHS[name] || ''} />
    </svg>
  )
}
