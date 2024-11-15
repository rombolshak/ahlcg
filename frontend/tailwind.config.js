/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      width: {
        "card-large": "375px",
        "card-small": "160px",
        "card-medium": "250px",
      },
      height: {
        "card-large": "525px",
        "card-small": "224px",
        "card-medium": "350px",
      },
      fontSize: {
        xxs: "0.5rem",
        m: "18px",
      },
      fontFamily: {
        conkordia: ["Conkordia"],
        teutonic: ["Teutonic"],
        "ah-symbol": ["AHSymbol"],
        arno: ["ArnoPro"],
        "arno-bold": ["ArnoProBold"],
      },
    },
  },
  plugins: [],
};
