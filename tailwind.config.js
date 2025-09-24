/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-bg': '#1A202C',
        'brand-surface': '#2D3748',
        'brand-surface-alt': '#4A5568',
        'brand-border': '#718096',
        'brand-primary': '#FFFFFF',
        'brand-primary-text': '#1A202C',
        'brand-secondary': '#E2E8F0',
        'brand-secondary-text': '#A0AEC0',
      }
    }
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
  // Production optimizations
  variants: {
    extend: {
      opacity: ['disabled'],
      cursor: ['disabled'],
    }
  },
}