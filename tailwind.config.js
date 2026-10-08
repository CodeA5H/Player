/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#111111',
        primary: '#eaeaea',
        secondary: '#888888',
        highlight: '#ffffff',
        accent: '#f0f0f0',
        player: '#1a1a1a',
      }
    },
  },
  plugins: [],
}
