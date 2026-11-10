import { Icon as Iconify } from '@iconify/react'
import { TOTEM_ART } from './totemArt.jsx'

// Monochrome UI icon (Phosphor). Inherits text color via currentColor.
export const Icon = ({ name, size = 18, className = '', style }) => (
  <Iconify icon={`ph:${name}`} width={size} height={size} className={className} style={style} />
)

// Profile totem: a fine-line white wireframe (see totemArt.jsx). It spins
// slowly in 3D on hover, or when a parent with `totem-host` is hovered.
// Unknown ids and legacy raw-emoji values fall back to the plain user icon,
// so no emoji ever render.
export const Totem = ({ icon, size = 24, className = '' }) => {
  if (!icon) return null
  const art = TOTEM_ART[icon]
  if (!art) return <Icon name="user" size={size} className={className} />
  return (
    <span className={`totem inline-block align-middle ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        // Screen px (non-scaling stroke, see index.css): 1.2px per the handoff;
        // a touch heavier in small list rows so the lines don't vanish.
        strokeWidth={size >= 24 ? 1.2 : 1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white"
        aria-hidden="true"
      >
        {art}
      </svg>
    </span>
  )
}
