// client/netlify/functions/api.ts

/**
 * Netlify Function: API (Express)
 *
 * ✅ O que faz:
 * - Cria um app Express dentro de uma Function do Netlify
 * - Usa o `attachRoutes` definido em server/routes.ts
 * - Todas as chamadas /api/* são redirecionadas para cá (netlify.toml)
 *
 * 🔧 Variáveis de ambiente obrigatórias no Netlify:
 * - DATABASE_URL  (Neon Postgres)
 * - JWT_SECRET
 * - ADMIN_MASTER_PIN (opcional, default 1234)
 * - EMAIL_SERVICE / EMAIL_USER / EMAIL_PASS (se usar e-mail)
 */

import express from "express";
import serverless from "serverless-http";
import { attachRoutes } from "../server/routes"; // ✅ corrigido caminho

// Cria instância do Express
const app = express();

// Middlewares padrão
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Registra todas as rotas vindas de server/routes.ts
attachRoutes(app);

// Exporta handler compatível com Netlify Functions
export const handler = serverless(app);
