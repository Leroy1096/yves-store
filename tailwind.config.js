/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0E0D0B', 800: '#1A1815', 700: '#2A2723', 500: '#5C5650', 400: '#8A837B' },
        ivory: { DEFAULT: '#F7F3EC', 100: '#FBF9F5', 200: '#EFE8DC', 300: '#E3D8C6' },
        gold: { DEFAULT: '#B8893B', light: '#D9B56E', dark: '#8E6726' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: { widest2: '0.32em' },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
      animation: { marquee: 'marquee 40s linear infinite', shimmer: 'shimmer 1.6s linear infinite' },
    },
  },
  plugins: [],
}
