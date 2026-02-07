/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Rubik', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        'rubik': ['Rubik', 'Roboto', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
      },
      colors: {
        "dark-blue": {
          900: "#0a0e1a",
          800: "#0f1419",
          700: "#1a1f2e",
          600: "#252b3d",
        },
        "light-blue": {
          400: "#60a5fa",
          500: "#3b82f6",
        },
        purple: {
          400: "#c084fc",
          500: "#a855f7",
          600: "#bf40ff",
        },
        "brand-blue": {
          500: "#0fbcf9",
          600: "#09a8e0",
        },
        "secondary": {
          500: "#34495e",
          600: "#2c3e50",
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
