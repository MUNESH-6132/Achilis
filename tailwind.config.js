/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-dark': 'rgb(var(--c-accent-dark) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        gold: {
          DEFAULT: '#B49B70',
          antique: '#B49B70',
          light: '#9B8158',
          subtle: 'rgba(180, 155, 112, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'Inter Display', 'Inter', 'sans-serif'],
        serif: ['Space Grotesk', 'Inter Display', 'sans-serif'],
        mono: ['Fragment Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
