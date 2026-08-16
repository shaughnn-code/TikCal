// Pure gesture resolution for swipe-to-navigate. No DOM — takes the raw
// pointer travel for a finished (or in-progress) drag and decides whether it
// counts as a swipe, and which direction, or whether it's a no-op (a tap, a
// sub-threshold nudge, or a drag along the wrong axis for this view).

// axis: 'x' (Week/Day — horizontal) | 'y' (Month — vertical, by design).
// Returns 'next' | 'prev' | null.
export function resolveSwipe({ dx, dy, axis, distanceThreshold = 50, axisRatio = 1.5 }) {
  const main = axis === 'y' ? dy : dx
  const cross = axis === 'y' ? dx : dy
  if (Math.abs(main) < distanceThreshold) return null
  if (Math.abs(main) < Math.abs(cross) * axisRatio) return null
  return main < 0 ? 'next' : 'prev'
}
