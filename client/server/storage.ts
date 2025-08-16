// client/server/storage.ts

/**
 * GodoySys – Storage Layer (Banco de Dados)
 *
 * 🔹 Este módulo centraliza todas as operações no Postgres.
 * 🔹 É usado pelo routes.ts.
 */

import { db } from "./db"; // conexão postgres (via drizzle/pg)
import {
  users,
  companies,
  products,
  orders,
  chatMessages,
} from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

// ===================== USUÁRIOS =====================
export const storage = {
  async getUserByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || null;
  },

  async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  },

  async createUser(userData: any) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  },

  async updateUserRefreshToken(userId: string, refreshToken: string | null) {
    await db.update(users).set({ refreshToken }).where(eq(users.id, userId));
  },

  async updateUserLastLogin(userId: string) {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, userId));
  },

  async getUsersByCompany(companyId: string) {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  },

  // ===================== EMPRESAS =====================
  async getCompany(companyId: string) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    return company || null;
  },

  async updateCompanySettings(companyId: string, settings: any) {
    const [company] = await db
      .update(companies)
      .set({ settings })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  },

  // ===================== PRODUTOS =====================
  async getProductsByCompany(companyId: string) {
    return await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));
  },

  async createProduct(productData: any) {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  },

  // ===================== PEDIDOS =====================
  async getOrdersByCompany(params: {
    companyId: string;
    status?: string;
    date?: string;
    limit?: number;
  }) {
    let query = db.select().from(orders).where(eq(orders.companyId, params.companyId));

    if (params.status) {
      query = db
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, params.companyId), eq(orders.status, params.status)));
    }

    if (params.date) {
      const dateObj = new Date(params.date);
      query = db
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, params.companyId), eq(orders.date, dateObj)));
    }

    return await query.limit(params.limit || 50);
  },

  async createOrder(orderData: any) {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  },

  // ===================== CHAT =====================
  async getChatMessages(companyId: string, channel: string, limit: number) {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.companyId, companyId),
          eq(chatMessages.channel, channel)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  },

  async createChatMessage(data: any) {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  },

  // ===================== DASHBOARD =====================
  async getDashboardMetrics(companyId: string) {
    const totalUsers = await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId));

    const totalProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    const totalOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.companyId, companyId));

    return {
      users: totalUsers.length,
      products: totalProducts.length,
      orders: totalOrders.length,
    };
  },
};


export const storage = new DatabaseStorage();
