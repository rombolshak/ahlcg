/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'conkordia': ['Conkordia'],
        'teutonic': ['Teutonic'],
        'ah-symbol': ['AHSymbol'],
        'arno': ['ArnoPro'],
        'arno-bold': ['ArnoProBold'],
      }
    },
  },
  plugins: [],
}

