/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        artitude: {
          red: "#CC0000",
          blush: "#FDEDEC",
          canvas: "#FAFAF8",
          text: "#1A1A1A",
          muted: "#64748B",
        }
      },
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        general: ['"General Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'marching-ants': {
          '0%': { strokeDashoffset: '20' },
          '100%': { strokeDashoffset: '0' },
        }
      },
      animation: {
        'marching-ants': 'marching-ants 1s linear infinite',
      }
    },
  },
  plugins: [],
}