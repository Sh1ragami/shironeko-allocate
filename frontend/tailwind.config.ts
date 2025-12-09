import type { Config } from 'tailwindcss'

// Enable alpha-aware CSS variable colors for dark theme tokens
const withOpacity = (variable: string) => {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`
    }
    return `rgb(var(${variable}))`
  }
}

export default {
  content: ['./index.html', './src/**/*.ts'],
  theme: {
    extend: {
      colors: {
        // High-contrast dark neutrals (mapped to Slate-like tokens)
        neutral: {
          50: withOpacity('--color-neutral-50'),
          100: withOpacity('--color-neutral-100'),
          200: withOpacity('--color-neutral-200'),
          300: withOpacity('--color-neutral-300'),
          400: withOpacity('--color-neutral-400'),
          500: withOpacity('--color-neutral-500'),
          600: withOpacity('--color-neutral-600'),
          700: withOpacity('--color-neutral-700'),
          800: withOpacity('--color-neutral-800'),
          900: withOpacity('--color-neutral-900'),
          950: withOpacity('--color-neutral-950'),
        },
        // Text and subtle foregrounds tuned for readability on dark
        gray: {
          50: withOpacity('--color-gray-50'),
          100: withOpacity('--color-gray-100'),
          200: withOpacity('--color-gray-200'),
          300: withOpacity('--color-gray-300'),
          400: withOpacity('--color-gray-400'),
          500: withOpacity('--color-gray-500'),
          600: withOpacity('--color-gray-600'),
          700: withOpacity('--color-gray-700'),
          800: withOpacity('--color-gray-800'),
          900: withOpacity('--color-gray-900'),
          950: withOpacity('--color-gray-950'),
        },
        // Links and accent color aligned with GitHub Primer blue
        blue: {
          50: withOpacity('--color-blue-50'),
          100: withOpacity('--color-blue-100'),
          200: withOpacity('--color-blue-200'),
          300: withOpacity('--color-blue-300'),
          400: withOpacity('--color-blue-400'),
          500: withOpacity('--color-blue-500'),
          600: withOpacity('--color-blue-600'),
          700: withOpacity('--color-blue-700'),
          800: withOpacity('--color-blue-800'),
          900: withOpacity('--color-blue-900'),
          950: withOpacity('--color-blue-950'),
        },
        // Success mapped to GitHub success green (used via emerald utilities)
        emerald: {
          500: withOpacity('--color-emerald-500'),
          600: withOpacity('--color-emerald-600'),
          700: withOpacity('--color-emerald-700'),
        },
      },
    },
  },
  plugins: [],
} satisfies Config
