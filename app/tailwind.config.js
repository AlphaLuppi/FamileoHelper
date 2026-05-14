/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4f0",
          100: "#fbe5dc",
          200: "#f6c8b3",
          300: "#efa183",
          400: "#e87a55",
          500: "#e15a33",
          600: "#cf4321",
          700: "#a8341b",
          800: "#7d2614",
          900: "#5a1c0f",
        },
        canvas: "#fbf8f4",
      },
    },
  },
  plugins: [],
};
