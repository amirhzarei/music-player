import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Background surfaces
        bg: {
          DEFAULT: "#121315",
          soft: "#181A1F",
          softer: "#1F2228",
        },
        // Text hierarchy
        text: {
          DEFAULT: "#F5F6F8",
          dim: "#C2C7D0",
          mute: "#8A93A2",
        },
        // Accent palette (adjust later to match Figma tokens exactly)
        accent: {
          DEFAULT: "#FF4D4D",
          50: "#FFF2F2",
          100: "#FFE5E5",
          200: "#FFBFBF",
          300: "#FF9999",
          400: "#FF7373",
          500: "#FF4D4D",
          600: "#E63333",
          700: "#CC1A1A",
          800: "#990000",
          900: "#660000",
        },
        "accent-alt": {
          DEFAULT: "#FF8A4D",
        },
        border: {
          DEFAULT: "#2B313C",
          strong: "#394150",
        },
      },
      boxShadow: {
        soft: "0 2px 4px -1px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        pill: "999px",
      },
      fontFamily: {
        // Map to system stack initially; replace with Figma font if specified later.
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
        ],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease forwards",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addVariant }) {
      addUtilities({
        ".rounded-pill": {
          borderRadius: "999px",
        },
      });

      // Support for data-state variants (future use with components)
      addVariant("data-open", '&[data-open="true"]');
      addVariant("data-closed", '&[data-open="false"]');
    }),
  ],
};

export default config;
