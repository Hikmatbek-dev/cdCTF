import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || "7000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production"
      ? [
          runtimeErrorOverlay(),
          ...(process.env.REPL_ID !== undefined
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, ".."),
                  }),
                ),
                await import("@replit/vite-plugin-dev-banner").then((m) =>
                  m.devBanner(),
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        /**
         * Split the vendors that do not belong on the critical path.
         *
         * Route-level code splitting (see src/App.tsx) already moves the pages
         * out, but a library imported by one lazy page still lands in the shared
         * chunk if Rollup thinks two chunks might want it. These three are used
         * on exactly one surface each, and naming them keeps that true:
         * recharts only by the admin dashboard, the QR encoder only by a
         * certificate, framer-motion by the page transition.
         *
         * React itself is split so it can be cached across deploys — it changes
         * far less often than the app does.
         */
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (id.includes("recharts") || id.includes("victory-vendor") || /[\\/]d3-[a-z]/.test(id)) return "charts";
          if (id.includes("qrcode")) return "qrcode";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          // Everything else, explicitly. Without this catch-all Rollup is free to
          // fold shared vendor code (clsx and friends, which every UI component
          // touches) into whichever named chunk it likes — and it chose "charts",
          // which made the entry statically depend on it and preload 384KB of
          // charting library for a visitor who will never open the admin panel.
          return "vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
      },
    },
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
