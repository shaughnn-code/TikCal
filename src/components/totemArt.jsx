// Fine-line wireframe totems (white 1.2px strokes, no fills), from the
// icon handoff (2026-11-10). Each entry is the inner SVG content for a
// 24×24 viewBox, keyed by the stored totem id (profiles.totem).
// Stroke, caps and joins are set once on the <svg> in icons.jsx.
export const TOTEM_ART = {
  // Earplugs — headphones
  'noto:headphone': (
    <>
      <path d="M5 13v-2a7 7 0 0 1 14 0v2" />
      <ellipse cx="6" cy="15.5" rx="2" ry="3" />
      <ellipse cx="18" cy="15.5" rx="2" ry="3" />
      <path d="M6 12.5v6M18 12.5v6" />
    </>
  ),
  // The Press — wireframe capsule
  'noto:pill': (
    <g transform="rotate(-35 12 12)">
      <rect x="3" y="8.5" width="18" height="7" rx="3.5" />
      <ellipse cx="12" cy="12" rx="1.2" ry="3.5" />
      <ellipse cx="7" cy="12" rx="1" ry="3.4" />
      <ellipse cx="17" cy="12" rx="1" ry="3.4" />
      <path d="M3.5 12h17" />
    </g>
  ),
  // Gum — a stick, as a flat box
  'noto:candy': (
    <>
      <path d="M4 10l10-3 6 3-10 3z" />
      <path d="M4 10v3l6 3v-3M10 16l10-3v-3" />
      <path d="M7 9.1l6 3" />
    </>
  ),
  // Shades
  'noto:sunglasses': (
    <>
      <path d="M2.5 9h19" />
      <path d="M4 9h6.5l-.5 4.5H5.5z" />
      <path d="M13.5 9H20l-1.5 4.5H14z" />
      <path d="M10.5 10.2q1.5-1 3 0" />
      <path d="M4 9l6 4.5M13.5 9l5 4.5" />
    </>
  ),
  // Glow Stick
  'noto:sparkler': (
    <>
      <g transform="rotate(45 13 13)">
        <rect x="11" y="5" width="4" height="16" rx="2" />
        <path d="M13 7v12" />
      </g>
      <path d="M5 2.5v5M2.5 5h5" />
    </>
  ),
  // Hydration — cup and straw
  'noto:cup-with-straw': (
    <>
      <ellipse cx="12" cy="7" rx="5" ry="1.5" />
      <ellipse cx="12" cy="19.5" rx="3.5" ry="1" />
      <path d="M7 7l1.5 12.5M17 7l-1.5 12.5" />
      <path d="M13 7l3-5h2" />
    </>
  ),
  // Lost Keys
  'noto:key': (
    <>
      <circle cx="7" cy="12" r="3" />
      <circle cx="7" cy="12" r="1" />
      <path d="M10 12h10M17 12v3M19.5 12v2.5" />
    </>
  ),
  // Dead Battery
  'noto:battery': (
    <>
      <rect x="7" y="6" width="10" height="15" rx="1.5" />
      <rect x="10" y="4" width="4" height="2" />
      <path d="M7 18h10M9.5 9.5l5 5" />
    </>
  ),
  // Hand Fan — ribs from the pivot, outer and inner arcs
  'noto:folding-hand-fan': (
    <>
      <path d="M12 18L3.34 13A10 10 0 0 1 20.66 13Z" />
      <path d="M9.4 16.5A3 3 0 0 1 14.6 16.5" />
      <path d="M12 18L5.57 10.34M12 18L8.58 8.6M12 18V8M12 18l3.42-9.4M12 18l6.43-7.66" />
      <circle cx="12" cy="19.5" r="0.9" />
    </>
  ),
  // Crumpled Cash
  'noto:money-with-wings': (
    <>
      <path d="M4 16l12-2 4-6-12 2z" />
      <path d="M6 12l12-2-2-4-12 2z" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  // Bumps — star inside a hexagon
  'noto:snowflake': (
    <>
      <path d="M12 3l7.79 4.5v9L12 21l-7.79-4.5v-9z" />
      <path d="M12 3l7.79 13.5H4.21z" />
      <path d="M12 21L4.21 7.5h15.58z" />
      <path d="M12 3v18M4.21 7.5l15.58 9M19.79 7.5l-15.58 9" />
    </>
  ),
  // Devil's Lettuce — crystal leaves
  "noto:herb": (
    <>
      <path d="M12 3l3 6-3 7-3-7z" />
      <path d="M9 9h6M12 3v13" />
      <path d="M12 16l-7.5-5.5 4.5.5z" />
      <path d="M12 16l7.5-5.5-4.5.5z" />
      <path d="M12 16v5" />
    </>
  ),
  // Shrooms
  'noto:mushroom': (
    <>
      <path d="M4 12a8 7 0 0 1 16 0z" />
      <path d="M9.5 12v6.5A1.5 1.5 0 0 0 11 20h2a1.5 1.5 0 0 0 1.5-1.5V12" />
      <circle cx="9" cy="8.5" r="1" />
      <circle cx="14.5" cy="7.5" r="0.8" />
    </>
  ),
  // Last Cig
  'noto:cigarette': (
    <>
      <rect x="3" y="10" width="15" height="4" rx="1" />
      <path d="M14 10v4" />
      <path d="M20 8c1 1-1 2 0 3s1 1 0 3" />
    </>
  ),
  // Woozy — spiral
  'noto:woozy-face': (
    <path d="M12 12a1 1 0 0 1 2 0a2 2 0 0 1-4 0a3 3 0 0 1 6 0a4 4 0 0 1-8 0a5 5 0 0 1 10 0a6 6 0 0 1-12 0" />
  ),
  // Sweaty — wave ribbon
  'noto:sweat-droplets': (
    <>
      <path d="M2 11.5c2-5 3.5-5 5 0s3 5 5 0 3-5 5 0 3 5 5 0" />
      <path d="M2 13.5c2-5 3.5-5 5 0s3 5 5 0 3-5 5 0 3 5 5 0" />
    </>
  ),
  // Tongue
  'noto:tongue': (
    <>
      <path d="M4 9c4 3 12 3 16 0" />
      <path d="M8 10.5c0 5 2.5 8 4 8s4-3 4-8" />
      <path d="M12 11v5" />
    </>
  ),
  // Peach
  'noto:peach': (
    <>
      <path d="M12 20c-5-2-8-5-8-9a4 4 0 0 1 8-1a4 4 0 0 1 8 1c0 4-3 7-8 9z" />
      <path d="M12 10c-1 3-1 6 0 10" />
      <path d="M12 6c1-2 3-3 5-2c-1 2-3 3-5 2z" />
    </>
  ),
  // Eggplant
  'noto:eggplant': (
    <>
      <path d="M6 17c4 4 11 2 13-3s-2-9-4-10" />
      <path d="M6 17c-2-4 2-10 9-13" />
      <path d="M15 4l2-2M15 4l3 1" />
    </>
  ),
  // Menace — horned skull
  'noto:smiling-face-with-horns': (
    <>
      <path d="M8 8h8l1 5-3 6h-4l-3-6z" />
      <path d="M8 8C6 7 4 5 4 2M16 8c2-1 4-3 4-6" />
      <path d="M8.5 11l2 .5-1 1.5zM15.5 11l-2 .5 1 1.5z" />
      <path d="M12 9v7M7 13l3 6M17 13l-3 6" />
    </>
  ),
}
