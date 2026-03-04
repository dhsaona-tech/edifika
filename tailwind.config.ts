import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
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
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(60,29,78,0.3), 0 0 60px rgba(60,29,78,0.1)" },
          "50%": { boxShadow: "0 0 30px rgba(60,29,78,0.5), 0 0 80px rgba(60,29,78,0.2)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out forwards",
        "fade-up-delay-1": "fade-up 0.7s ease-out 0.1s forwards",
        "fade-up-delay-2": "fade-up 0.7s ease-out 0.2s forwards",
        "fade-up-delay-3": "fade-up 0.7s ease-out 0.3s forwards",
        "fade-up-delay-4": "fade-up 0.7s ease-out 0.4s forwards",
        "fade-in": "fade-in 1s ease-out forwards",
        "fade-in-delay-1": "fade-in 1s ease-out 0.3s forwards",
        "fade-in-delay-2": "fade-in 1s ease-out 0.6s forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;