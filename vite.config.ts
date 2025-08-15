import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Remove o plugin específico do Replit para produção no Netlify
    ...(process.env.NODE_ENV === "development" && process.env.REPL_ID
      ? [await import("@replit/vite-plugin-cartographer").then(m => m.cartographer())]
      : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets")
    }
  },
  // Configuração essencial para o Netlify
  root: "./client",
  build: {
    outDir: "../dist",  // Alterado para compatibilidade
    emptyOutDir: true,
    rollupOptions: {
      external: ["zustand"]  // Adiciona zustand como externo se necessário
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["*/."]
    },
    port: 3000  // Porta explícita para evitar conflitos
  },
  // Otimização para Netlify
  base: "/",  // Garante caminhos absolutos
  define: {
    "process.env": process.env  // Compatibilidade com variáveis de ambiente
  }
});
