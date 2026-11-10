// Where to put a floating card next to an anchor so it stays inside a bounds
// box (the calendar). Opens below and left-aligned by default; flips to
// right-aligned near the right edge and above near the bottom, then clamps.
// All values are viewport pixels (getBoundingClientRect).
export function placePopover(anchor, card, bounds, gap = 8, margin = 8) {
  const minLeft = bounds.left + margin
  const maxLeft = bounds.right - margin - card.width
  let left = anchor.left
  if (left > maxLeft) left = anchor.right - card.width
  left = Math.max(minLeft, Math.min(left, maxLeft))

  const minTop = bounds.top + margin
  const maxTop = bounds.bottom - margin - card.height
  let top = anchor.bottom + gap
  if (top > maxTop) {
    const above = anchor.top - gap - card.height
    top = above >= minTop ? above : maxTop
  }
  top = Math.max(minTop, top)
  return { left: Math.round(left), top: Math.round(top) }
}

// The visible part of the calendar: the calendar box intersected with the
// viewport, so a tall calendar that runs off-screen doesn't push the card out.
export function visibleBounds(box, viewport) {
  return {
    left: Math.max(box.left, 0),
    top: Math.max(box.top, 0),
    right: Math.min(box.right, viewport.width),
    bottom: Math.min(box.bottom, viewport.height),
  }
}
