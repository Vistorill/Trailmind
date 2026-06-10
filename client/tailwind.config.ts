import type { Config } from "tailwindcss";

/**
 * Tailwind CSS v4 — config complementar.
 * Tokens principais ficam em src/index.css via @theme.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
