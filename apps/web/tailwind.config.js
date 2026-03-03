/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        // WCAG 2.1 AA compliant colors
        safe: {
          DEFAULT: '#15803d', // green-700 - 4.5:1 on white
          light: '#22c55e'    // green-500
        },
        risky: {
          DEFAULT: '#dc2626', // red-600 - 4.5:1 on white
          light: '#ef4444'    // red-500
        }
      }
    }
  },
  plugins: []
}
