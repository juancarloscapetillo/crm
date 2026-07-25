import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        calume: {
          navy: "#253574",
          navyDark: "#1a2758",
          navyLight: "#354694",
          gold: "#F6B436",
          goldDark: "#dd9e22",
          goldLight: "#FCD98A",
        },
        stage: {
          informes: "#5B8DEF",
          visita: "#F6B436",
          negociacion: "#9B6FD9",
          ganado: "#3FBE7A",
          perdido: "#E15B5B",
        },
        alert: {
          green: "#3FBE7A",
          yellow: "#F0B429",
          red: "#E15B5B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        popover: "0 10px 40px -10px rgb(0 0 0 / 0.25)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
