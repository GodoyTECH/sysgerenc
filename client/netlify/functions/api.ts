// client/netlify/functions/api.ts

import express from "express";
import serverless from "serverless-http";
import { attachRoutes } from "../server/routes"; // sobe 2 níveis até client/, depois entra em server/

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Monta todas as rotas com prefixo /api
const router = express.Router();
attachRoutes(router);
app.use("/api", router);

export const handler = serverless(app);

