/** @type {import('tailwindcss').Config} */

const config = {

  content: [

    "./app/**/*.{js,ts,jsx,tsx,mdx}",

    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    "./lib/**/*.{js,ts,jsx,tsx,mdx}",

  ],

  safelist: [

    "flex",

    "hidden",

    "md:flex",

    "h-screen",

    "bg-background",

    "bg-sidebar",

    "bg-card",

    "bg-card-hover",

    "bg-card-elevated",

    "bg-primary",

    "text-foreground",

    "text-muted",

    "text-muted-foreground",

    "text-primary",

    "text-primary-foreground",

    "border-border",

    "shadow-card",

    "shadow-glow",

    "shadow-sidebar",

    "rounded-xl",

    "rounded-2xl",

    "font-sans",

    "max-w-content",

    "lg:grid-cols-7",

    "lg:grid-cols-3",

    "sm:grid-cols-2",

    "btp-app-shell",

    "btp-sidebar",

    "btp-card",

    "btp-planning-week-grid",

    "btp-page-container",

    "btp-dashboard",

    "btp-app-page",

    "w-[150px]",

    "w-[170px]",

    "w-[120px]",

    "min-w-[120px]",

    "btp-dashboard-stats",

    "w-[260px]",

    "max-w-7xl",

    "box-border",

    {

      pattern:

        /^(bg|text|border)-(background|foreground|sidebar|card|primary|muted|border|success|danger)(\/(5|10|15|20|25|30|70|80|90|95))?$/,

    },

    {

      pattern:

        /^(bg|border)-(card|card-elevated|card-hover|primary)(\/(5|10|15|20|25|30|60|70|80|90|95))?$/,

    },

  ],

  theme: {

    extend: {

      colors: {

        background: "rgb(var(--color-background) / <alpha-value>)",

        foreground: "rgb(var(--color-foreground) / <alpha-value>)",

        sidebar: "rgb(var(--color-sidebar) / <alpha-value>)",

        card: {

          DEFAULT: "rgb(var(--color-card) / <alpha-value>)",

          hover: "rgb(var(--color-card-hover) / <alpha-value>)",

          elevated: "rgb(var(--color-card-elevated) / <alpha-value>)",

        },

        border: {

          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",

          subtle: "rgb(var(--color-border-subtle) / 0.06)",

        },

        muted: {

          DEFAULT: "rgb(var(--color-muted) / <alpha-value>)",

          foreground: "rgb(var(--color-muted-foreground) / <alpha-value>)",

        },

        primary: {

          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",

          hover: "rgb(var(--color-primary-hover) / <alpha-value>)",

          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)",

        },

        success: "rgb(var(--color-success) / <alpha-value>)",

        "success-foreground": "rgb(var(--color-success-text) / <alpha-value>)",

        warning: "rgb(var(--color-warning) / <alpha-value>)",

        "warning-foreground": "rgb(var(--color-warning-text) / <alpha-value>)",

        danger: "rgb(var(--color-danger) / <alpha-value>)",

        "danger-foreground": "rgb(var(--color-danger-text) / <alpha-value>)",

        info: "rgb(var(--color-info-text) / <alpha-value>)",

        "info-foreground": "rgb(var(--color-info-text) / <alpha-value>)",

      },

      fontFamily: {

        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],

        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],

      },

      fontSize: {

        "2xs": ["0.6875rem", { lineHeight: "1rem" }],

      },

      boxShadow: {

        card: "var(--shadow-card)",

        "card-hover": "var(--shadow-card-hover)",

        glow: "var(--shadow-glow)",

        sidebar: "var(--shadow-sidebar)",

      },

      borderRadius: {

        xl: "0.75rem",

        "2xl": "1rem",

        "3xl": "1.25rem",

      },

      spacing: {

        18: "4.5rem",

        22: "5.5rem",

      },

      maxWidth: {

        content: "1400px",

      },

      transitionDuration: {

        theme: "250ms",

      },

    },

  },

  plugins: [],

};



module.exports = config;

