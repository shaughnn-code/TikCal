/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0e12', // base
        ink2: '#040608', // deeper
        ice: '#4cc9f0', // primary accent
        mint: '#6EE7B7', // secondary / positive
        accent: '#4cc9f0', // legacy alias → ice
      },
      fontFamily: {
        display: ['Saira', 'system-ui', 'sans-serif'], // headings / wordmark
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'], // labels / data
        sans: ['Inter', 'system-ui', 'sans-serif'], // body
      },
    },
  },
  plugins: [],
}
