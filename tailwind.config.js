/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0e12',
        ink2: '#040608',
        ice: '#4cc9f0',
        mint: '#6EE7B7',
        accent: '#4cc9f0',
        orange: '#ff6b2b',

        // Calendar-zoom design handoff. `cyan` is the single chrome accent;
        // event chips keep their crew/artist hue via getEventAccent, and
        // Overlap keeps orange=free / mint=shared. Color stays information.
        cyan: '#2FE6E6',
        'cyan-dim': '#1a8f8f',
        panel: '#11161b',
        'panel-2': '#161d24',
        line: '#232b33',
        muted: '#8fa3ab',
        faint: '#5a6b73',
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
