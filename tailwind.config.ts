import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "#EDF0F3",
        tinta: "#16212C",
        suave: "#5B6773",
        linha: "#D3D9DF",
        aprovar: "#1D7A4B",
        rejeitar: "#B3372F",
        shopee: "#EE4D2D",
      },
    },
  },
  plugins: [],
};

export default config;
