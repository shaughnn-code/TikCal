// Static "gel glass" TikCal for nav-size marks: no GPU loop. An inline SVG
// (unlike an <img> SVG, it can use web fonts) lit by an SVG filter — the
// blurred glyph alpha becomes a height map, feSpecularLighting puts a hot
// highlight on the rounded bevel, and the result is screened back over a
// chrome (or violet) body. Geometry is in a 100-unit font box, so the bevel
// scales with `fontSize`; the filter padding hangs outside the layout box via
// negative margins, so it takes the same space as the plain-text wordmark.

import { useId, useLayoutEffect, useState } from 'react'
import { BARLOW, fontSpec } from '../lib/wordmark.js'

const measure = (text, face) => {
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = fontSpec(face, 100)
  const m = ctx.measureText(text)
  return {
    w: Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight),
    asc: Math.ceil(m.actualBoundingBoxAscent),
    desc: Math.ceil(m.actualBoundingBoxDescent),
    left: m.actualBoundingBoxLeft,
  }
}

// Body fills. `chrome` is a mirror gradient (bright top, dark horizon band,
// second flash, light ground) to sit beside the liquid-metal hero; `violet`
// is a tinted gel.
const BODIES = {
  chrome: [[0, '#ffffff'], [0.3, '#c9cfdc'], [0.47, '#4a4f63'], [0.53, '#5b5470'], [0.6, '#f2eefb'], [0.82, '#b3aecb'], [1, '#e4e1f0']],
  violet: [[0, '#e9dcff'], [0.35, '#a77bff'], [0.6, '#6d4bd8'], [1, '#d8dde8']],
}

export default function GlassWordmark({ text = 'TikCal', face = BARLOW, fontSize = 30, tone = 'chrome', className = '' }) {
  const id = useId().replace(/:/g, '')
  const [box, setBox] = useState(null)
  useLayoutEffect(() => {
    let live = true
    setBox(measure(text, face))
    document.fonts.load(fontSpec(face, 100), text).then(() => live && setBox(measure(text, face)))
    return () => { live = false }
  }, [text, face])
  if (!box) return <span style={{ display: 'inline-block', height: fontSize }} />

  const pad = 8
  const vw = box.w + pad * 2
  const vh = box.asc + box.desc + pad * 2
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={`0 0 ${vw} ${vh}`}
      style={{
        width: (vw * fontSize) / 100,
        height: (vh * fontSize) / 100,
        margin: (-pad * fontSize) / 100,
        overflow: 'visible',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2={tone === 'chrome' ? 0 : 1} y2="1">
          {BODIES[tone].map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <filter id={`${id}f`} x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="h" />
          <feSpecularLighting in="h" surfaceScale="6" specularConstant="1.25" specularExponent="26" lightingColor="#ffffff" result="s">
            <fePointLight x={vw * 0.25} y={-vh * 0.9} z="160" />
          </feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="si" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="rim0" />
          <feComposite in="SourceAlpha" in2="rim0" operator="out" result="rim" />
          <feFlood floodColor="#ffffff" floodOpacity="0.55" />
          <feComposite in2="rim" operator="in" result="rimc" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="rimc" />
            <feMergeNode in="si" />
          </feMerge>
        </filter>
        <filter id={`${id}g`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <text
        x={pad + box.left}
        y={pad + box.asc}
        fontFamily={`'${face.family}', system-ui, sans-serif`}
        fontStyle={face.style}
        fontWeight={face.weight}
        fontSize="100"
        fill="#8b5cff"
        opacity="0.45"
        filter={`url(#${id}g)`}
      >
        {text}
      </text>
      <text
        x={pad + box.left}
        y={pad + box.asc}
        fontFamily={`'${face.family}', system-ui, sans-serif`}
        fontStyle={face.style}
        fontWeight={face.weight}
        fontSize="100"
        fill={`url(#${id}b)`}
        filter={`url(#${id}f)`}
      >
        {text}
      </text>
    </svg>
  )
}
