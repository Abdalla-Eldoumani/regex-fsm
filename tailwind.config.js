/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FFFCF5',
        parchment: '#F5F1E8',
        canvas: '#EBE7DD',
        ink: '#1A1A1A',
        'ink-light': '#4A4A4A',
        'ink-lighter': '#7A7A7A',
        border: '#D4CFC0',
        'border-dark': '#B8B3A8',
        terracotta: '#C1666B',
        'terracotta-light': '#D98B8F',
        'terracotta-dark': '#A8565A',
        teal: '#4A7C7E',
        'teal-light': '#6B9B9D',
        'teal-dark': '#3A6365',
        ochre: '#D4A574',
        'ochre-light': '#E5C19D',
        'ochre-dark': '#B88D5E',
        sage: '#8B9D83',
        'sage-light': '#A8B8A1',
        'sage-dark': '#6F8269',
      },
      fontFamily: {
        display: ['Crimson Pro', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
