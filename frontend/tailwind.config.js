/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      width: {
        "card": "375px"
      },
      height: {
        "card": "525px"
      },
      fontFamily: {
        "conkordia": ["Conkordia"],
        "teutonic": ["Teutonic"],
        "ah-symbol": ["AHSymbol"],
        "arno": ["ArnoPro"],
        "arno-bold": ["ArnoProBold"]
      }
    }
  },
  plugins: []
};

