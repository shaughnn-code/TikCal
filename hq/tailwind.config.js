/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0e1013',
        panel: '#161a20',
        panel2: '#1d222b',
        line: '#2a3039',
        fg: '#e9ecf2',
        mut: '#8f97a8',
        gold: '#e8b45a',
        blue: '#6aa5f8',
        green: '#57c98a',
        red: '#ef6b6b',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
