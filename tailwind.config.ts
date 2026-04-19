import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px"
      }
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["SF Mono", "Fira Code", "ui-monospace", "monospace"],
        display: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        logo: ["var(--font-logo)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        /** Toasts — entrada suave com leve deslize + escala */
        "toast-in": {
          from: {
            opacity: "0",
            filter: "blur(4px)",
            transform: "translate3d(14px, 12px, 0) scale(0.94)"
          },
          to: {
            opacity: "1",
            filter: "blur(0)",
            transform: "translate3d(0, 0, 0) scale(1)"
          }
        },
        "toast-out": {
          from: {
            opacity: "1",
            filter: "blur(0)",
            transform: "translate3d(0, 0, 0) scale(1)"
          },
          to: {
            opacity: "0",
            filter: "blur(2px)",
            transform: "translate3d(18px, 6px, 0) scale(0.96)"
          }
        },
        "dialog-overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "dialog-in": {
          from: {
            opacity: "0",
            transform: "translate3d(0, 12px, 0) scale(0.94)"
          },
          to: {
            opacity: "1",
            transform: "translate3d(0, 0, 0) scale(1)"
          }
        },
        "toast-icon-in": {
          from: { opacity: "0", transform: "scale(0.5) rotate(-12deg)" },
          to: { opacity: "1", transform: "scale(1) rotate(0deg)" }
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" }
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "toast-in":
          "toast-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-out":
          "toast-out 0.36s cubic-bezier(0.4, 0, 0.92, 0.4) forwards",
        "dialog-overlay-in": "dialog-overlay-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "dialog-in": "dialog-in 0.48s cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-icon-in":
          "toast-icon-in 0.45s cubic-bezier(0.34, 1.3, 0.64, 1) 0.08s both",
        shimmer: "shimmer 3s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      }
    }
  },
  plugins: []
};

export default config;
