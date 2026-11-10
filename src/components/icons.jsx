import { Icon as Iconify } from '@iconify/react'
import { TOTEMS } from '../lib/constants.js'

// Monochrome UI icon (Phosphor). Inherits text color via currentColor.
export const Icon = ({ name, size = 18, className = '', style }) => (
  <Iconify icon={`ph:${name}`} width={size} height={size} className={className} style={style} />
)

// Profile totem, drawn as a Phosphor duotone icon in the brand violet.
// `icon` is the stored totem id (see TOTEMS). Unknown ids and legacy raw
// emoji strings fall back to the plain user icon, so no emoji ever render.
const TOTEM_PH = Object.fromEntries(TOTEMS.map((t) => [t.icon, t.ph]))
export const Totem = ({ icon, size = 24, className = '' }) => {
  if (!icon) return null
  const ph = TOTEM_PH[icon] || (typeof icon === 'string' && icon.startsWith('ph:') ? icon.slice(3) : 'user')
  return <Iconify icon={`ph:${ph}-duotone`} width={size} height={size} className={`text-aurora ${className}`} />
}
