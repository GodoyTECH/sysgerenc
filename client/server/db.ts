// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Conexão com Neon Postgres (SSL vem no URL do Neon)
export const pool = new Pool({ connectionString: url });

// Drizzle com schema para tipagem forte
export const db = drizzle({ client: pool, schema });

// (Opcional) helper para checar a conexão em cold starts
export async function ping() {
  // Consulta barata, útil para levantar a pool em ambientes serverless
  await pool.query("SELECT 1");
}

