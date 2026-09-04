import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`, `.claude`, et la doc/README --
      // ces derniers ne font partie d'aucun module du bundle mais restaient regardes par
      // le watcher par defaut, et le plugin Tailwind v4 (scan large du repo pour detecter
      // les classes utilisees) redeclenchait un full-reload CSS a chaque edition de
      // README.md/docs/**, faisant clignoter/disparaitre l'avatar dans la fenetre "main".
      ignored: [
        "**/src-tauri/**",
        "**/.claude/**",
        "**/docs/**",
        "**/README*.md",
      ],
    },
  },
}));
