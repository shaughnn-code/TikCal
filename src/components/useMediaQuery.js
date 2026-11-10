import { useSyncExternalStore } from 'react'

// Live `matchMedia` result. Re-renders when the query flips (rotation,
// window resize), so a layout branch never goes stale.
export default function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia?.(query)
      if (!mq) return () => {}
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => !!window.matchMedia?.(query).matches,
    () => false,
  )
}
