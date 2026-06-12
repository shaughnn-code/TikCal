/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#6DAA67',
        ink: '#0F0F0F',
      },
      fontFamily: {
        // Spec fonts
        logo: ['Barlow', 'system-ui', 'sans-serif'],       // 800 italic
        heading: ['Syne', 'system-ui', 'sans-serif'],        // 700/800
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'], // body
      },
    },
  },
  plugins: [],
}
