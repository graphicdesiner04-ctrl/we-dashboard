import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        we: {
          DEFAULT: '#6B21A8',
          dark:    '#4C1D95',
          muted:   'rgba(107,33,168,0.12)',
          border:  'rgba(107,33,168,0.28)',
        },
      },
    },
  },
  plugins: [],
}

export default config
