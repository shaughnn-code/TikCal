import { useEffect } from 'react'

const KEY_DIR = {
  x: { ArrowLeft: 'next', ArrowRight: 'prev' },
  y: { ArrowUp: 'next', ArrowDown: 'prev' },
}

// Desktop-only affordance, separate from useSwipe: a keypress is already
// discrete, so there's no drag/threshold/suppression to resolve here -- just
// a direct key -> direction mapping, using the same per-view axis convention
// as the swipe gesture (so a given view answers to the same physical
// direction whichever input made it).
export default function useCalendarKeys(ref, { axis, onStep }) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onKeyDown = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const dir = (KEY_DIR[axis] || {})[e.key]
      if (!dir) return
      e.preventDefault()
      onStep(dir)
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [ref, axis, onStep])
}
