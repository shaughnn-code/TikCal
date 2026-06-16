import { Icon as Iconify } from '@iconify/react'

// Monochrome UI icon (Phosphor). Inherits text color via currentColor.
export const Icon = ({ name, size = 18, className = '', style }) => (
  <Iconify icon={`ph:${name}`} width={size} height={size} className={className} style={style} />
)

// Full-color totem (Noto). `icon` is a full Iconify id like "noto:pill".
// Falls back to rendering a raw emoji string for legacy profile values.
export const Totem = ({ icon, size = 24, className = '' }) => {
  if (!icon) return null
  if (typeof icon === 'string' && icon.includes(':')) {
    return <Iconify icon={icon} width={size} height={size} className={className} />
  }
  // legacy emoji fallback
  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
      {icon}
    </span>
  )
}
