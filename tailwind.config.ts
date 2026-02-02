import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <--- ESTO escanea TODO dentro de src
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#3c1d4e",
          light: "#5e3b75",
          dark: "#2a1438",
        },
        secondary: {
          DEFAULT: "#e7e7e7",
          dark: "#d1d1d1",
        }
      },
    },
  },
  plugins: [],
};
export default config;