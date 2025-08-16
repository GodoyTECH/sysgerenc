/**
 * Netlify Function: API (Express)
 * 
 * ✅ O que faz:
 * - Converte o app Express em uma Function usando serverless-http
 * - Registra TODAS as rotas HTTP (sem WebSockets)
 * - Redireciona chamadas /api/* do client para cá (ver netlify.toml)
 * 
 * 🔧 Variáveis de ambiente obrigatórias (defina no Netlify):
 * - DATABASE_URL  (Neon Postgres)
 * - JWT_SECRET
 * - ADMIN_MASTER_PIN (opcional, default 1234)
 * - EMAIL_SERVICE / EMAIL_USER / EMAIL_PASS (se usar e-mail)
 */
import express from "express";
import serverless from "serverless-http";
import { attachRoutes } from "../../server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Registra as rotas SEM WebSockets (Functions não suportam WS nativamente)
attachRoutes(app);

// Exporta handler compatível com Netlify Functions
export const handler = serverless(app);
