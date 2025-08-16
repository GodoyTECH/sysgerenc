import { db } from "./db";
import * as schema from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

// ================= USERS =================
export async function getUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  return user || null;
}

export async function getUser(id: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return user || null;
}

export async function getUsersByCompany(companyId: string) {
  return db.select().from(schema.users).where(eq(schema.users.companyId, companyId));
}

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
