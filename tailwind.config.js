/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rr: {
          bg: '#080D1A',
          card: '#0F172A',
          cardHover: '#131F37',
          border: '#1E293B',
          borderLight: '#334155',
          pink: '#EA1A85',
          pinkDark: '#C2136C',
          pinkLight: '#FF4DA6',
          pinkGlow: 'rgba(234, 26, 133, 0.18)',
          blue: '#004BA0',
          royalBlue: '#2563EB',
          blueGlow: 'rgba(37, 99, 235, 0.18)',
          gold: '#F59E0B',
          emerald: '#10B981',
          danger: '#EF4444',
          muted: '#94A3B8',
          text: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
