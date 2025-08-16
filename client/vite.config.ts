import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  // Raiz já é a pasta client, então não precisa repetir
  root: ".",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist", // saída fica em client/dist
    emptyOutDir: true,
    rollupOptions: {
      external: ["zustand", "zustand/middleware"],
    },
  },
  server: {
    port: 3000,
  },
})
