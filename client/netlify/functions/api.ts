// client/netlify/functions/api.ts

import express from "express";
import serverless from "serverless-http";
import { attachRoutes } from "../../server/routes"; // ✅ sobe 2 níveis até client/, depois entra em server/

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 🔑 Corrigido: prefixo da função Netlify
const router = express.Router();
attachRoutes(router);
app.use("/.netlify/functions/api", router);

export const handler = serverless(app);

