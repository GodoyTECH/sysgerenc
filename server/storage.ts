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
  type AuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, count, sum } from "drizzle-orm";

// Interface completa para o storage
export interface IStorage {
  // Métodos de usuários
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  updateUserRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
  updateUserLastLogin(userId: string): Promise<void>;

  // Métodos de empresas
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompanySettings(companyId: string, settings: any): Promise<Company>;

  // Métodos de categorias
  createCategory(category: InsertCategory): Promise<Category>;
  getCategoriesByCompany(companyId: string): Promise<Category[]>;

  // Métodos de produtos
  createProduct(product: InsertProduct): Promise<Product>;
  getProductsByCompany(companyId: string): Promise<Product[]>;
  getProductsWithSalesData(companyId: string): Promise<any[]>;
  getTopProducts(companyId: string, limit: number): Promise<any[]>;
  getLowStockProducts(companyId: string): Promise<Product[]>;

  // Métodos de pedidos
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByCompany(filters: { companyId: string; status?: string; date?: string; limit?: number }): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, companyId: string): Promise<Order | undefined>;

  // Métodos de chat
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(companyId: string, channel: string, limit: number): Promise<ChatMessage[]>;

  // Métodos de auditoria
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: string, limit: number): Promise<AuditLog[]>;

  // Métodos de relatórios
  getDashboardMetrics(companyId: string): Promise<any>;
  getSalesHistory(companyId: string, days: number): Promise<any[]>;
  getSalesReportData(companyId: string, startDate: Date, endDate: Date): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // ===================== MÉTODOS DE USUÁRIOS =====================
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(desc(users.createdAt));
  }

  async updateUserRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await db
      .update(users)
      .set({ 
        refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // ===================== MÉTODOS DE EMPRESAS =====================

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ...insertCompany,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return company;
  }

  async updateCompanySettings(companyId: string, settings: any): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ 
        settings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  // ===================== MÉTODOS DE CATEGORIAS =====================

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values({
        ...insertCategory,
        createdAt: new Date(),
      })
      .returning();
    return category;
  }

  async getCategoriesByCompany(companyId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.companyId, companyId), eq(categories.isActive, true)))
      .orderBy(categories.name);
  }

  // ===================== MÉTODOS DE PRODUTOS =====================

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return product;
  }

  async getProductsByCompany(companyId: string): Promise<Product[]> {
    return await db
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

    return await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        cost: products.cost,
        stock: products.stock,
        isActive: products.isActive,
        categoryName: categories.name,
        salesCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        salesRevenue: sql<number>`COALESCE(SUM(${orderItems.total}), 0)`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(orders, and(
        eq(orderItems.orderId, orders.id),
        gte(orders.createdAt, thirtyDaysAgo)
      ))
      .where(eq(products.companyId, companyId))
      .groupBy(products.id, products.name, products.price, products.cost, products.stock, products.isActive, categories.name)
      .orderBy(desc(sql`salesRevenue`));
  }

  async getTopProducts(companyId: string, limit: number): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await db
      .select({
        name: products.name,
        price: products.price,
        categoryName: categories.name,
        totalSold: sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue: sql<number>`SUM(${orderItems.total})`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .innerJoin(orders, and(
        eq(orderItems.orderId, orders.id),
        gte(orders.createdAt, thirtyDaysAgo)
      ))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.companyId, companyId))
      .groupBy(products.id, products.name, products.price, categories.name)
      .orderBy(desc(sql`totalRevenue`))
      .limit(limit);
  }

  async getLowStockProducts(companyId: string): Promise<Product[]> {
    return await db
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

  // ===================== MÉTODOS DE PEDIDOS =====================

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db
      .insert(orders)
      .values({
        ...insertOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return order;
  }

  async getOrdersByCompany(filters: { 
    companyId: string; 
    status?: string; 
    date?: string; 
    limit?: number 
  }): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .where(eq(orders.companyId, filters.companyId));

    if (filters.status) {
      query = query.where(eq(orders.status, filters.status as any));
    }

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query = query.where(
        and(
          gte(orders.createdAt, targetDate),
          lte(orders.createdAt, nextDay)
        )
      );
    }

    const result = await query
      .orderBy(desc(orders.createdAt))
      .limit(filters.limit || 50);

    return result;
  }

  async updateOrderStatus(orderId: string, status: string, companyId: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ 
        status: status as any,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.companyId, companyId)))
      .returning();
    
    return order || undefined;
  }

  // ===================== MÉTODOS DE CHAT =====================

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values({
        ...insertMessage,
        createdAt: new Date(),
      })
      .returning();
    return message;
  }

  async getChatMessages(companyId: string, channel: string, limit: number): Promise<ChatMessage[]> {
    return await db
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
      .where(
        and(
          eq(chatMessages.companyId, companyId),
          eq(chatMessages.channel, channel as any)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  // ===================== MÉTODOS DE AUDITORIA =====================

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        ...insertLog,
        createdAt: new Date(),
      })
      .returning();
    return log;
  }

  async getAuditLogs(companyId: string, limit: number): Promise<AuditLog[]> {
    return await db
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

  // ===================== MÉTODOS DE RELATÓRIOS =====================

  async getDashboardMetrics(companyId: string): Promise<any> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    // Vendas de hoje
    const todaySalesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, todayStart),
          eq(orders.paymentStatus, 'paid')
        )
      );

    // Vendas de ontem para comparação
    const yesterdaySalesResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, yesterday),
          lte(orders.createdAt, todayStart),
          eq(orders.paymentStatus, 'paid')
        )
      );

    // Pedidos pendentes
    const pendingOrdersResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          sql`${orders.status} IN ('pending', 'preparing')`
        )
      );

    // Produtos em estoque baixo
    const lowStockResult = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          eq(products.isActive, true),
          sql`${products.stock} <= ${products.minStock}`
        )
      );

    const todaySales = todaySalesResult[0] || { total: 0, count: 0 };
    const yesterdaySales = yesterdaySalesResult[0] || { total: 0 };
    const pendingOrders = pendingOrdersResult[0] || { count: 0 };
    const lowStock = lowStockResult[0] || { count: 0 };

    // Calcular crescimento
    const salesGrowth = yesterdaySales.total > 0 
      ? ((Number(todaySales.total) - Number(yesterdaySales.total)) / Number(yesterdaySales.total)) * 100
      : 0;

    // Calcular ticket médio
    const avgTicket = todaySales.count > 0 
      ? Number(todaySales.total) / todaySales.count
      : 0;

    return {
      todaySales: `R$ ${Number(todaySales.total).toFixed(2)}`,
      todayOrders: todaySales.count,
      salesGrowth: `${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}%`,
      avgTicket: `R$ ${avgTicket.toFixed(2)}`,
      pendingOrders: pendingOrders.count,
      lowStockCount: lowStock.count,
      avgWaitTime: '15 min', // Pode ser calculado baseado nos pedidos
    };
  }

  async getSalesHistory(companyId: string, days: number): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        total: sql<number>`SUM(${orders.total})`,
        orderCount: sql<number>`COUNT(*)`,
        avgTicket: sql<number>`AVG(${orders.total})`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
          eq(orders.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);
  }

  async getSalesReportData(companyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        total: sql<number>`SUM(${orders.total})`,
        orderCount: sql<number>`COUNT(*)`,
        avgTicket: sql<number>`AVG(${orders.total})`,
        topPaymentMethod: sql<string>`
          (SELECT payment_method 
           FROM orders o2 
           WHERE DATE(o2.created_at) = DATE(${orders.createdAt}) 
             AND o2.company_id = ${companyId}
           GROUP BY payment_method 
           ORDER BY COUNT(*) DESC 
           LIMIT 1)
        `,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
          eq(orders.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);
  }
}

export const storage = new DatabaseStorage();
