/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        slateglass: {
          900: "#060b17",
          800: "#0b1427",
          700: "#111d34",
          600: "#182643",
          500: "#1f3052",
          accent: "#3b82f6",
          danger: "#f87171",
          success: "#34d399",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 25px 70px -35px rgba(15, 23, 42, 0.65)",
      },
    },
  },
  plugins: [],
};
