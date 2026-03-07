/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        tactical: {
          black: '#000000',
          amber: '#FFBF00',
          'amber-dim': '#B8860B',
        },
      },
    },
  },
  plugins: [],
};
