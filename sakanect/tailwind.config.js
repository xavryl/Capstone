/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'saka-green': '#2ecc71', // Your main brand color
        'saka-dark': '#27ae60',  // Darker green for hover buttons
        'saka-light': '#eafaf1', // Light background green
      }
    },
  },
  plugins: [],
}