// client/netlify/functions/api.ts
// =======================================
// Função Serverless do Netlify que carrega o Express
// e conecta todas as rotas do backend.
// =======================================

import express from "express";
import serverless from "serverless-http";
import { attachRoutes } from "../../server/routes"; 
// ✅ Sobe 2 níveis (de functions até client/) e entra em server/routes.ts

// Cria app Express
const app = express();

// Middlewares necessários para interpretar JSON e URL-encoded
// Sem isso, req.body chega vazio → causava 400 no login
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Anexa todas as rotas definidas em client/server/routes.ts
attachRoutes(app);

// Exporta o handler compatível com Netlify Functions
export const handler = serverless(app);
