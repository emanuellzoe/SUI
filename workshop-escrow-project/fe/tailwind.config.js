/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme
        dark: {
          900: "#0f1419",
          800: "#1a1f2e",
          700: "#252a3d",
          600: "#2f3349",
          500: "#3a3d56",
          400: "#52546b",
          300: "#6b6d80",
          200: "#8b8d9e",
          100: "#b0b2c3",
        },
        // Primary colors
        primary: {
          400: "#3b82f6",
          500: "#2563eb",
        },
        // Secondary colors
        secondary: {
          400: "#8b5cf6",
          500: "#7c3aed",
        },
        // Accent colors
        accent: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
          pink: "#ec4899",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#ef4444",
          orange: "#f97316",
          cyan: "#06b6d4",
          emerald: "#10b981",
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        spin: "spin 1s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          from: { textShadow: "0 0 10px rgba(59, 130, 246, 0.5)" },
          to: { textShadow: "0 0 20px rgba(139, 92, 246, 0.8)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      scale: {
        102: "1.02",
      },
    },
  },
  plugins: [],
};
