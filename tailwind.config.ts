import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        duke: {
          deep: "hsl(220 100% 15%)",
          navy: "hsl(220 100% 22%)",
          blue: "hsl(220 100% 27%)",
          royal: "hsl(218 100% 32%)",
          bright: "hsl(216 100% 40%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "xs": "var(--shadow-xs)",
        "duke": "var(--shadow-md)",
        "duke-lg": "var(--shadow-lg)",
        "duke-xl": "var(--shadow-xl)",
        "duke-2xl": "var(--shadow-2xl)",
        "glow": "var(--shadow-glow)",
        "pressed": "var(--shadow-pressed)",
        "hover": "var(--shadow-hover)",
        "active": "var(--shadow-active)",
        "float": "var(--shadow-float)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "duke": "var(--shadow-md)",
        "duke-lg": "var(--shadow-lg)",
        "duke-xl": "var(--shadow-xl)",
        "glow": "var(--shadow-glow)",
        "pressed": "var(--shadow-pressed)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pop": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "50%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shake": {
          "10%, 90%": { transform: "translateX(-1px)" },
          "20%, 80%": { transform: "translateX(2px)" },
          "30%, 50%, 70%": { transform: "translateX(-3px)" },
          "40%, 60%": { transform: "translateX(3px)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(220 100% 27% / 0.4)", opacity: "1" },
          "50%": { boxShadow: "0 0 16px 6px hsl(220 100% 27% / 0.3)", opacity: "0.9" },
        },
        "pulse-elevation": {
          "0%, 100%": { boxShadow: "var(--shadow-lg)" },
          "50%": { boxShadow: "var(--shadow-xl)" },
        },
        "increment": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.3s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "pop": "pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "shake": "shake 0.5s cubic-bezier(.36,.07,.19,.97) both",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pulse-elevation": "pulse-elevation 2s ease-in-out infinite",
        "increment": "increment 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, hsl(220 100% 27%), hsl(216 100% 40%))",
        "gradient-secondary": "linear-gradient(135deg, hsl(216 100% 40%), hsl(220 100% 27%))",
        "gradient-accent": "linear-gradient(135deg, hsl(220 100% 20%), hsl(216 100% 45%))",
        "gradient-hero": "linear-gradient(180deg, hsl(220 100% 20%) 0%, hsl(216 100% 35%) 50%, hsl(220 100% 25%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
