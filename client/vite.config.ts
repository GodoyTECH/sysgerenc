import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  root: ".", // já é a pasta client
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",   // saída final vai para client/dist
    emptyOutDir: true // limpa antes de buildar
  },
  server: {
    port: 3000,
  },
})
