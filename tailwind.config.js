/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black aurora base (softened off pure #000 so the light-leak reads).
        ink: '#0b0b11',
        ink2: '#060609',
        ice: '#4cc9f0',
        mint: '#6EE7B7',
        accent: '#a06bff',
        orange: '#ff6b2b',

        // Aurora signature — the one brand hue, a magenta→violet→iris light-leak.
        // Used only where TikCal speaks in its own voice (wordmark, hero, primary
        // CTA, current-time marker). Data hues below stay meaningful because the
        // chrome doesn't fight them.
        aurora: '#c04bff',   // magenta core
        violet: '#8b5cff',   // mid
        iris: '#5b6bff',      // blue tail

        // `cyan` is the cool chrome accent; event chips keep their crew/artist hue
        // via getEventAccent, and Overlap keeps orange=free / mint=shared. Color
        // stays information.
        cyan: '#2FE6E6',
        'cyan-dim': '#1a8f8f',
        panel: '#15151c',
        'panel-2': '#1c1c25',
        line: '#28282f',
        muted: '#8f8fa3',
        faint: '#5a5a6b',
      },
      keyframes: {
        // Zoom transition: the outgoing view scales up and fades while the
        // incoming one rises from 0.92. Both run 320ms, per the handoff.
        zoomIn: { from: { opacity: 0, transform: 'scale(.92)' }, to: { opacity: 1, transform: 'scale(1)' } },
        zoomOut: { from: { opacity: 1, transform: 'scale(1)' }, to: { opacity: 0, transform: 'scale(1.08)' } },
      },
      animation: {
        'zoom-in': 'zoomIn .32s ease forwards',
        'zoom-out': 'zoomOut .32s ease forwards',
      },
      fontFamily: {
        display: ['Barlow', 'system-ui', 'sans-serif'],       // logo (italic 800)
        heading: ['Syne', 'system-ui', 'sans-serif'],          // section headings
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],  // body
      },
    },
  },
  plugins: [],
}
