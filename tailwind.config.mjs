/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
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
          500: "#4169e1",
          600: "#3454c9",
        },
      },
    },
  },
  plugins: [],
};
