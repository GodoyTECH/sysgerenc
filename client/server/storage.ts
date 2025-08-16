// server/storage.ts
import { db } from "./db";
import {
  companies,
  users,
  categories,
  products,
  orders,
  orderItems,
  chatMessages,
  auditLogs,
  type Company,
  type User,
  type InsertUser,
  type InsertCompany,
  type InsertCategory,
  type InsertProduct,
  type InsertOrder,
  type InsertOrderItem,
  type InsertChatMessage,
  type InsertAuditLog,
  type Category,
  type Product,
  type Order,
  type OrderItem,
  type ChatMessage,
  type AuditLog,
} from "../shared/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

// ===================== Interface (para referência) =====================
// (Mantida compatível com o que suas rotas esperam)
export interface IStorage {
  // Usuários
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  updateUserRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  updateUserLastLogin(userId: string): Promise<void>;

  // Empresas
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompanySettings(companyId: string, settings: any): Promise<Company>;

  // Categorias
  createCategory(category: InsertCategory): Promise<Category>;
  getCategoriesByCompany(companyId: string): Promise<Category[]>;

  // Produtos
  createProduct(product: InsertProduct): Promise<Product>;
  getProductsByCompany(companyId: string): Promise<any[]>;
  getProductsWithSalesData(companyId: string): Promise<any[]>;
  getTopProducts(companyId: string, limit: number): Promise<any[]>;
  getLowStockProducts(companyId: string): Promise<Product[]>;

  // Pedidos
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByCompany(filters: {
    companyId: string;
    status?: string;
    date?: string;
    limit?: number;
  }): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, companyId: string): Promise<Order | undefined>;

  // Chat
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(companyId: string, channel: string, limit: number): Promise<any[]>;

  // Auditoria
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: string, limit: number): Promise<any[]>;

  // Relatórios
  getDashboardMetrics(companyId: string): Promise<any>;
  getSalesHistory(companyId: string, days: number): Promise<any[]>;
  getSalesReportData(companyId: string, startDate: Date, endDate: Date): Promise<any[]>;
}

// ===================== Implementação =====================
export class DatabaseStorage implements IStorage {
  // -------- Usuários --------
  async getUser(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row || undefined;
    }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.username, username));
    return row || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Senha já deve vir com hash das rotas
    const [row] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(desc(users.createdAt));
  }

  async updateUserRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await db
      .update(users)
      .set({ refreshToken, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // -------- Empresas --------
  async getCompany(id: string): Promise<Company | undefined> {
    const [row] = await db.select().from(companies).where(eq(companies.id, id));
    return row || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [row] = await db
      .insert(companies)
      .values({
        ...insertCompany,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateCompanySettings(companyId: string, settings: any): Promise<Company> {
    const [row] = await db
      .update(companies)
      .set({ settings, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return row;
  }

  // -------- Categorias --------
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [row] = await db
      .insert(categories)
      .values({
        ...insertCategory,
        createdAt: new Date(),
      })
      .returning();
    return row;
  }

  async getCategoriesByCompany(companyId: string): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.isActive, true)))
      .orderBy(categories.name);
  }

  // -------- Produtos --------
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [row] = await db
      .insert(products)
      .values({
        ...insertProduct,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async getProductsByCompany(companyId: string): Promise<any[]> {
    return db
      .select({
        id: products.id,
        companyId: products.companyId,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price: products.price,
        cost: products.cost,
        stock: products.stock,
        minStock: products.minStock,
        attributes: products.attributes,
        isActive: products.isActive,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.companyId, companyId))
      .orderBy(products.name);
  }

  async getProductsWithSalesData(companyId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Agregações + groupBy
    const salesCountExpr = sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`;
    const salesRevenueExpr = sql<number>`COALESCE(SUM(${orderItems.total}), 0)`;

    return db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        cost: products.cost,
        stock: products.stock,
        isActive: products.isActive,
        categoryName: categories.name,
        salesCount: salesCountExpr,
        salesRevenue: salesRevenueExpr,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(
        orders,
        and(eq(orderItems.orderId, orders.id), gte(orders.createdAt, thirtyDaysAgo))
      )
      .where(eq(products.companyId, companyId))
      .groupBy(
        products.id,
        products.name,
        products.price,
        products.cost,
        products.stock,
        products.isActive,
        categories.name
      )
      // Usar a própria expressão na ordenação (não usar alias)
      .orderBy(desc(salesRevenueExpr));
  }

  async getTopProducts(companyId: string, limit: number): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalSoldExpr = sql<number>`SUM(${orderItems.quantity})`;
    const totalRevenueExpr = sql<number>`SUM(${orderItems.total})`;

    return db
      .select({
        name: products.name,
        price: products.price,
        categoryName: categories.name,
        totalSold: totalSoldExpr,
        totalRevenue: totalRevenueExpr,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(
        orders,
        and(eq(orderItems.orderId, orders.id), gte(orders.createdAt, thirtyDaysAgo))
      )
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.companyId, companyId))
      .groupBy(products.id, products.name, products.price, categories.name)
      .orderBy(desc(totalRevenueExpr))
      .limit(limit);
  }

  async getLowStockProducts(companyId: string): Promise<Product[]> {
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      )
      .orderBy(products.name);
  }

  // -------- Pedidos --------
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [row] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async getOrdersByCompany(filters: {
    companyId: string;
    status?: string;
    date?: string;
    limit?: number;
  }): Promise<Order[]> {
    const conditions = [eq(orders.companyId, filters.companyId)];

    if (filters.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(gte(orders.createdAt, targetDate));
      conditions.push(lte(orders.createdAt, nextDay));
    }

    return db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit ?? 50);
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    companyId: string
  ): Promise<Order | undefined> {
    const [row] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.companyId, companyId)))
      .returning();
    return row || undefined;
  }

  // -------- Chat --------
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [row] = await db
      .insert(chatMessages)
      .values({ ...insertMessage, createdAt: new Date() })
      .returning();
    return row;
  }

  async getChatMessages(companyId: string, channel: string, limit: number): Promise<any[]> {
    return db
      .select({
        id: chatMessages.id,
        companyId: chatMessages.companyId,
        userId: chatMessages.userId,
        channel: chatMessages.channel,
        message: chatMessages.message,
        isRead: chatMessages.isRead,
        createdAt: chatMessages.createdAt,
        userName: users.name,
        userRole: users.role,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(and(eq(chatMessages.companyId, companyId), eq(chatMessages.channel, channel as any)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  // -------- Auditoria --------
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [row] = await db
      .insert(auditLogs)
      .values({ ...insertLog, createdAt: new Date() })
      .returning();
    return row;
  }

  async getAuditLogs(companyId: string, limit: number): Promise<any[]> {
    return db
      .select({
        id: auditLogs.id,
        companyId: auditLogs.companyId,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.companyId, companyId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // -------- Relatórios / Métricas --------
  async getDashboardMetrics(companyId: string): Promise<any> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Vendas de hoje
    const [todaySales] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(eq(orders.companyId, companyId), gte(orders.createdAt, todayStart), eq(orders.paymentStatus, "paid"))
      );

    // Vendas de ontem (para comparação)
    const [yesterdaySales] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, yesterdayStart),
          lte(orders.createdAt, todayStart),
          eq(orders.paymentStatus, "paid")
        )
      );

    // Pedidos pendentes/preparando
    const [pendingOrders] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(eq(orders.companyId, companyId), sql`${orders.status} IN ('pending', 'preparing')`));

    // Produtos com estoque baixo
    const [lowStock] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.isActive, true), sql`${products.stock} <= ${products.minStock}`)
      );

    const todayTotal = Number((todaySales?.total ?? 0) as any);
    const todayCount = Number((todaySales?.count ?? 0) as any);
    const yesterdayTotal = Number((yesterdaySales?.total ?? 0) as any);

    const salesGrowth = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0;
    const avgTicket = todayCount > 0 ? todayTotal / todayCount : 0;

    return {
      todaySales: `R$ ${todayTotal.toFixed(2)}`,
      todayOrders: todayCount,
      salesGrowth: `${salesGrowth >= 0 ? "+" : ""}${salesGrowth.toFixed(1)}%`,
      avgTicket: `R$ ${avgTicket.toFixed(2)}`,
      pendingOrders: Number((pendingOrders?.count ?? 0) as any),
      lowStockCount: Number((lowStock?.count ?? 0) as any),
      avgWaitTime: "15 min",
    };
  }

  async getSalesHistory(companyId: string, days: number): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dateExpr = sql<string>`DATE(${orders.createdAt})`;

    return db
      .select({
        date: dateExpr,
        total: sql<number>`SUM(${orders.total})`,
        orderCount: sql<number>`COUNT(*)`,
        avgTicket: sql<number>`AVG(${orders.total})`,
      })
      .from(orders)
      .where(
        and(eq(orders.companyId, companyId), gte(orders.createdAt, startDate), lte(orders.createdAt, endDate), eq(orders.paymentStatus, "paid"))
      )
      .groupBy(dateExpr)
      .orderBy(dateExpr);
  }

  async getSalesReportData(companyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const dateExpr = sql<string>`DATE(${orders.createdAt})`;

    return db
      .select({
        date: dateExpr,
        total: sql<number>`SUM(${orders.total})`,
        orderCount: sql<number>`COUNT(*)`,
        avgTicket: sql<number>`AVG(${orders.total})`,
        topPaymentMethod: sql<string>`
          (
            SELECT payment_method
            FROM orders o2
            WHERE DATE(o2.created_at) = DATE(${orders.createdAt})
              AND o2.company_id = ${companyId}
            GROUP BY payment_method
            ORDER BY COUNT(*) DESC
            LIMIT 1
          )
        `,
      })
      .from(orders)
      .where(
        and(eq(orders.companyId, companyId), gte(orders.createdAt, startDate), lte(orders.createdAt, endDate), eq(orders.paymentStatus, "paid"))
      )
      .groupBy(dateExpr)
      .orderBy(dateExpr);
  }
}

export const storage = new DatabaseStorage();
