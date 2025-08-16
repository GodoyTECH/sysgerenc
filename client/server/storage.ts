// client/server/storage.ts

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
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId))
    .limit(1);
  return company || null;
}

export async function updateCompanySettings(companyId: string, settings: any) {
  const [company] = await db
    .update(schema.companies)
    .set({ settings })
    .where(eq(schema.companies.id, companyId))
    .returning();
  return company;
}

// ================= PRODUCTS =================
export async function getProductsByCompany(companyId: string) {
  return db
    .select()
    .from(schema.products)
    .where(eq(schema.products.companyId, companyId));
}

export async function createProduct(productData: typeof schema.insertProductSchema._type) {
  const [product] = await db.insert(schema.products).values(productData).returning();
  return product;
}

// ================= ORDERS =================
export async function getOrdersByCompany({
  companyId,
  status,
  date,
  limit,
}: {
  companyId: string;
  status?: string;
  date?: string;
  limit?: number;
}) {
  let query = db.select().from(schema.orders).where(eq(schema.orders.companyId, companyId));

  if (status) {
    query = query.where(eq(schema.orders.status, status));
  }
  if (date) {
    query = query.where(eq(schema.orders.date, date));
  }

  return query.orderBy(desc(schema.orders.date)).limit(limit || 50);
}

export async function createOrder(orderData: typeof schema.insertOrderSchema._type) {
  const [order] = await db.insert(schema.orders).values(orderData).returning();
  return order;
}

// ================= CHAT =================
export async function getChatMessages(companyId: string, channel: string, limit: number) {
  return db
    .select()
    .from(schema.chatMessages)
    .where(and(eq(schema.chatMessages.companyId, companyId), eq(schema.chatMessages.channel, channel)))
    .orderBy(desc(schema.chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(messageData: typeof schema.chatMessages.$inferInsert) {
  const [message] = await db.insert(schema.chatMessages).values(messageData).returning();
  return message;
}

// ================= REPORTS =================
export async function getDashboardMetrics(companyId: string) {
  const [usersCount] = await db
    .select({ count: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.companyId, companyId));

  const [ordersCount] = await db
    .select({ count: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.companyId, companyId));

  return {
    users: usersCount?.count || 0,
    orders: ordersCount?.count || 0,
  };
}
