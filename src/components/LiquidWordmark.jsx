// Animated liquid-metal "TikCal" for the hero. Paper's LiquidMetal shader
// inflates an alpha mask into a beveled chrome surface. The mask is drawn
// to a canvas after the web font loads: an SVG loaded as an <img> can't use
// web fonts, so a <text>-based SVG would render in a fallback face.

import { useEffect, useState } from 'react'
import { LiquidMetal } from '@paper-design/shaders-react'
import { BARLOW, fontSpec } from '../lib/wordmark.js'

const maskCache = new Map()
const MASK_PX = 320
const PAD = 0.12

// Rasterize `text` in `face` ({ style, weight, family }) to a
// transparent PNG. Returns { url, w, h } so the caller can size its box to
// the mask and the shader's `contain` fit leaves no letterbox.
async function wordmarkMask(text, face) {
  const key = `${fontSpec(face, 1)}|${text}`
  if (maskCache.has(key)) return maskCache.get(key)
  const px = MASK_PX
  const spec = fontSpec(face, px)
  const pending = (async () => {
    await document.fonts.load(spec, text)
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    ctx.font = spec
    const m = ctx.measureText(text)
    const pad = px * PAD
    const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight + pad * 2)
    const h = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + pad * 2)
    c.width = w
    c.height = h
    ctx.font = spec
    ctx.fillStyle = '#000'
    ctx.fillText(text, pad + m.actualBoundingBoxLeft, pad + m.actualBoundingBoxAscent)
    return { url: c.toDataURL('image/png'), w, h }
  })()
  maskCache.set(key, pending)
  return pending
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// `fontSize` matches the CSS text size it replaces: the canvas is cut to the
// glyph box and the mask's padding hangs outside it via negative margins, so
// layout is the same as the plain-text wordmark.
export default function LiquidWordmark({
  text = 'TikCal',
  face = BARLOW,
  fontSize = 56,
  // colorBack is the canvas background (transparent); colorTint color-dodges
  // the chrome. White keeps it pure silver; a lavender tint muddied the lower
  // half of each glyph to indigo.
  colorBack = '#00000000',
  colorTint = '#ffffff',
  fallback = null,
  className = '',
  ...tune
}) {
  const [mask, setMask] = useState(null)
  useEffect(() => {
    let live = true
    wordmarkMask(text, face).then((m) => live && setMask(m))
    return () => { live = false }
  }, [text, face])

  const k = fontSize / MASK_PX
  const height = mask?.h * k
  const bleed = PAD * fontSize
  // Until the mask is drawn, and (via Suspense) while Paper inflates it,
  // show the caller's static mark rather than an empty box.
  if (!mask) return fallback
  return (
    <LiquidMetal
      aria-hidden="true"
      className={className}
      style={{ width: mask.w * k, height, display: 'inline-block', verticalAlign: 'middle', margin: -bleed }}
      image={mask.url}
      suspendWhenProcessingImage
      fit="contain"
      scale={1}
      colorBack={colorBack}
      colorTint={colorTint}
      speed={reducedMotion() ? 0 : 0.6}
      repetition={2.5}
      softness={0.25}
      shiftRed={0.3}
      shiftBlue={0.3}
      distortion={0.2}
      contour={1}
      angle={70}
      shape="none"
      {...tune}
    />
  )
}
