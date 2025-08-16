import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // ⚙️ Netlify: Vite vai rodar a partir da pasta "client"
  root: path.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  build: { outDir: "../dist",
    rollupOptions: {
      external: ["zustand", "zustand/middleware"],
    },
  },
  server: {
    port: 3000,
  },
});
