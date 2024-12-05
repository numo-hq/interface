const colors = require("tailwindcss/colors");

const brandColors = {
  DEFAULT: "#6246ea",
};

const gray = {
  50: "#f5f5f4",
  100: "#EFEFEF",
  200: "#dfdfdf",
  300: "#cfcfcf",
  500: "#8f8f8f",
  700: "#505050",
};

const custom = {
  red: "rgb(255,59,48)",
  blue: "rgb(0,122,255)",
  green: "rgb(52,199,89)",
  background: "#fffffe",
  button: "#6246ea",
  highlight: "#6246ea",
  secondary: "#d1d1e9",
  tertiary: "#e45858",
  stroke: "#2b2c34",
  main: "#fffffe",
};

const textColor = {
  DEFAULT: "#000000",
  default: "#000000",
  headline: "#2b2c34",
  paragraph: "#2b2c34",
  button: "#fffffe",
  secondary: "#707070",
  red: "rgb(255,59,48)",
  blue: "rgb(0,122,255)",
  green: "rgb(52,199,89)",
};

module.exports = {
  content: ["./src/**/*.{html,ts,tsx}"],
  mode: "jit",
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "976px",
      xl: "1320px",
    },
    extend: {
      fontSize: {
        xs: "0.8125rem",
      },
      colors: {
        ...colors,
        ...custom,
        brand: brandColors,
        gray: gray,
      },
      textColor,
      scale: {
        98: ".98",
        102: "1.02",
      },
    },
  },
  plugins: [
    require("@tailwindcss/aspect-ratio"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
