import { useEffect, useRef } from 'react'
import { resolveSwipe } from '../../lib/calendar/swipe.js'

// Wraps native Pointer Events so mouse-drag (desktop) and finger-swipe
// (mobile, in the browser or the Capacitor-wrapped app) share one gesture
// path -- mouse and touch fire the same pointerdown/move/up sequence, so no
// library and no platform branching is needed.
//
// `axis` is 'x' (Week/Day -- horizontal) or 'y' (Month -- vertical, by
// design). Returns a ref that's true for one tick right after a swipe
// commits, so a click handler on the same element can bail out instead of
// also firing (the click that follows pointerup on the dragged element).
export default function useSwipe(ref, { axis, onSwipe }) {
  const suppressClickRef = useRef(false)
  const dragRef = useRef(null) // { startX, startY, pointerId }

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onPointerDown = (e) => {
      if (e.button != null && e.button !== 0) return // ignore right/middle-click drags
      dragRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId }
      el.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e) => {
      const s = dragRef.current
      if (!s || s.pointerId !== e.pointerId) return
      s.dx = e.clientX - s.startX
      s.dy = e.clientY - s.startY
    }

    const onPointerUp = (e) => {
      const s = dragRef.current
      dragRef.current = null
      if (!s || s.pointerId !== e.pointerId) return
      const dir = resolveSwipe({ dx: s.dx || 0, dy: s.dy || 0, axis })
      if (!dir) return
      suppressClickRef.current = true
      setTimeout(() => { suppressClickRef.current = false }, 0)
      onSwipe(dir)
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [ref, axis, onSwipe])

  return suppressClickRef
}
