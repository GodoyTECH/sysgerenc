/**
 /**
 * Netlify Function: API (Express)
 *
 * ✅ O que faz:
 * - Converte o app Express em uma Function usando serverless-http
 * - Usa o mesmo `app` definido em server/index.ts (com rotas e middlewares)
 * - Redireciona chamadas /api/* do client para cá (via netlify.toml)
 */

import serverless from "serverless-http";
import { app } from "../../server/index";

// Exporta handler compatível com Netlify Functions
export const handler = serverless(app);
