import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../shared/schema";

// 🔌 Configuração WebSocket para Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to configure?");
}

// 🔌 Banco de dados (Neon Postgres via Drizzle)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool, schema });

export async function createUser(userData: typeof schema.insertUserSchema._type) {
  const [user] = await db.insert(schema.users).values(userData).returning();
  return user;
}

export async function updateUserRefreshToken(userId: string, refreshToken: string | null) {
  await db.update(schema.users)
    .set({ refreshToken })
    .where(eq(schema.users.id, userId));
}

export async function updateUserLastLogin(userId: string) {
  await db.update(schema.users)
    .set({ lastLogin: new Date() })
    .where(eq(schema.users.id, userId));
}

// ================= COMPANIES =================
export async function getCompany(companyId: string) {
  const [company]
