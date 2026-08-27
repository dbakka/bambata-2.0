/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#ffffff",
          panel: "#f8fafc",
          card: "#fafafa",
          border: "#e4e4e7",
          pink: "#ec4899",
          pinkDark: "#db2777",
          pinkLight: "#fdf2f8",
          pinkMuted: "#fbcfe8",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'pink-soft': '0 4px 20px -2px rgba(236, 72, 153, 0.25)',
      }
    },
  },
  plugins: [],
}
