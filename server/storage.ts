/**
 * GodoySys - Sistema de Gerenciamento
 * Módulo de Armazenamento de Dados (Storage)
 * 
 * Este módulo implementa a interface de armazenamento usando PostgreSQL
 * com Drizzle ORM, fornecendo operações CRUD para todas as entidades
 * do sistema com suporte multi-tenant.
 */

import { 
  type User, 
  type InsertUser,
  type Company,
  type InsertCompany,
  type Product,
  type InsertProduct,
  type ProductCategory,
  type InsertProductCategory,
  type Order,
  type InsertOrder,
  type ChatMessage,
  type InsertChatMessage,
  type AuditLog,
  type InsertAuditLog,
  users,
  companies,
  products,
  productCategories,
  orders,
  chatMessages,
  auditLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, count, sql, like, gte, lte } from "drizzle-orm";

// Interface principal do sistema de armazenamento
export interface IStorage {
  // Métodos para Empresas (Companies)
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByEmail(email: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined>;

  // Métodos para Usuários (Users) - Multi-tenant
  getUser(id: string, companyId: string): Promise<User | undefined>;
  getUserByUsername(username: string, companyId: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, companyId: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string, companyId: string): Promise<boolean>;

  // Métodos para Categorias de Produtos
  getProductCategories(companyId: string): Promise<ProductCategory[]>;
  getProductCategory(id: string, companyId: string): Promise<ProductCategory | undefined>;
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  updateProductCategory(id: string, companyId: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory | undefined>;

  // Métodos para Produtos - Multi-tenant
  getProducts(companyId: string, filters?: { categoryId?: string; active?: boolean }): Promise<Product[]>;
  getProduct(id: string, companyId: string): Promise<Product | undefined>;
  getProductsByLowStock(companyId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, companyId: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, companyId: string): Promise<boolean>;

  // Métodos para Pedidos - Multi-tenant
  getOrders(companyId: string, filters?: { 
    status?: string; 
    dateStart?: Date; 
    dateEnd?: Date;
    userId?: string;
  }): Promise<Order[]>;
  getOrder(id: string, companyId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, companyId: string, updates: Partial<InsertOrder>): Promise<Order | undefined>;
  
  // Métodos para Chat - Multi-tenant
  getChatMessages(companyId: string, channel: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Métodos para Logs de Auditoria - Multi-tenant
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: string, filters?: {
    userId?: string;
    action?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }): Promise<AuditLog[]>;

  // Métodos para Relatórios e Métricas
  getTodayMetrics(companyId: string): Promise<{
    todaySales: number;
    pendingOrders: number;
    avgTicket: number;
    lowStockCount: number;
  }>;
}

/**
 * Implementação da interface de armazenamento usando PostgreSQL
 * Todas as operações respeitam o modelo multi-tenant através do companyId
 */
export class DatabaseStorage implements IStorage {
  
  // ============ MÉTODOS PARA EMPRESAS ============
  
  /**
   * Busca uma empresa pelo ID
   */
  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  /**
   * Busca uma empresa pelo email
   */
  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.email, email));
    return company || undefined;
  }

  /**
   * Cria uma nova empresa
   */
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values({
        ...company,
        updatedAt: new Date(),
      })
      .returning();
    return newCompany;
  }

  /**
   * Atualiza uma empresa existente
   */
  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updatedCompany] = await db
      .update(companies)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany || undefined;
  }

  // ============ MÉTODOS PARA USUÁRIOS ============

  /**
   * Busca um usuário pelo ID dentro de uma empresa específica
   */
  async getUser(id: string, companyId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, companyId)));
    return user || undefined;
  }

  /**
   * Busca um usuário pelo username dentro de uma empresa específica
   */
  async getUserByUsername(username: string, companyId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.companyId, companyId)));
    return user || undefined;
  }

  /**
   * Lista todos os usuários de uma empresa
   */
  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(asc(users.name));
  }

  /**
   * Cria um novo usuário
   */
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }

  /**
   * Atualiza um usuário existente
   */
  async updateUser(id: string, companyId: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.companyId, companyId)))
      .returning();
    return updatedUser || undefined;
  }

  /**
   * Remove um usuário (soft delete via isActive)
   */
  async deleteUser(id: string, companyId: string): Promise<boolean> {
    const [deletedUser] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, id), eq(users.companyId, companyId)))
      .returning();
    return !!deletedUser;
  }

  // ============ MÉTODOS PARA CATEGORIAS DE PRODUTOS ============

  /**
   * Lista todas as categorias de produtos de uma empresa
   */
  async getProductCategories(companyId: string): Promise<ProductCategory[]> {
    return await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.companyId, companyId))
      .orderBy(asc(productCategories.name));
  }

  /**
   * Busca uma categoria específica
   */
  async getProductCategory(id: string, companyId: string): Promise<ProductCategory | undefined> {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.id, id), eq(productCategories.companyId, companyId)));
    return category || undefined;
  }

  /**
   * Cria uma nova categoria de produto
   */
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [newCategory] = await db
      .insert(productCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  /**
   * Atualiza uma categoria de produto existente
   */
  async updateProductCategory(id: string, companyId: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    const [updatedCategory] = await db
      .update(productCategories)
      .set(updates)
      .where(and(eq(productCategories.id, id), eq(productCategories.companyId, companyId)))
      .returning();
    return updatedCategory || undefined;
  }

  // ============ MÉTODOS PARA PRODUTOS ============

  /**
   * Lista produtos com filtros opcionais
   */
  async getProducts(companyId: string, filters?: { categoryId?: string; active?: boolean }): Promise<Product[]> {
    let query = db.select().from(products).where(eq(products.companyId, companyId));
    
    if (filters?.categoryId) {
      query = query.where(and(eq(products.companyId, companyId), eq(products.categoryId, filters.categoryId)));
    }
    
    if (filters?.active !== undefined) {
      query = query.where(and(eq(products.companyId, companyId), eq(products.isActive, filters.active)));
    }
    
    return await query.orderBy(asc(products.name));
  }

  /**
   * Busca um produto específico
   */
  async getProduct(id: string, companyId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.companyId, companyId)));
    return product || undefined;
  }

  /**
   * Lista produtos com estoque baixo
   */
  async getProductsByLowStock(companyId: string): Promise<Product[]> {
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
      .orderBy(asc(products.stock));
  }

  /**
   * Cria um novo produto
   */
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values({
        ...product,
        updatedAt: new Date(),
      })
      .returning();
    return newProduct;
  }

  /**
   * Atualiza um produto existente
   */
  async updateProduct(id: string, companyId: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning();
    return updatedProduct || undefined;
  }

  /**
   * Remove um produto (soft delete via isActive)
   */
  async deleteProduct(id: string, companyId: string): Promise<boolean> {
    const [deletedProduct] = await db
      .update(products)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning();
    return !!deletedProduct;
  }

  // ============ MÉTODOS PARA PEDIDOS ============

  /**
   * Lista pedidos com filtros opcionais
   */
  async getOrders(companyId: string, filters?: { 
    status?: string; 
    dateStart?: Date; 
    dateEnd?: Date;
    userId?: string;
  }): Promise<Order[]> {
    let conditions = [eq(orders.companyId, companyId)];
    
    if (filters?.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }
    
    if (filters?.userId) {
      conditions.push(eq(orders.userId, filters.userId));
    }
    
    if (filters?.dateStart) {
      conditions.push(gte(orders.createdAt, filters.dateStart));
    }
    
    if (filters?.dateEnd) {
      conditions.push(lte(orders.createdAt, filters.dateEnd));
    }

    return await db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));
  }

  /**
   * Busca um pedido específico
   */
  async getOrder(id: string, companyId: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId)));
    return order || undefined;
  }

  /**
   * Cria um novo pedido
   */
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        updatedAt: new Date(),
      })
      .returning();
    return newOrder;
  }

  /**
   * Atualiza um pedido existente
   */
  async updateOrder(id: string, companyId: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, id), eq(orders.companyId, companyId)))
      .returning();
    return updatedOrder || undefined;
  }

  // ============ MÉTODOS PARA CHAT ============

  /**
   * Lista mensagens de chat de um canal específico
   */
  async getChatMessages(companyId: string, channel: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.companyId, companyId), eq(chatMessages.channel, channel as any)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  /**
   * Cria uma nova mensagem de chat
   */
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // ============ MÉTODOS PARA LOGS DE AUDITORIA ============

  /**
   * Cria um novo log de auditoria
   */
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
  }

  /**
   * Lista logs de auditoria com filtros
   */
  async getAuditLogs(companyId: string, filters?: {
    userId?: string;
    action?: string;
    dateStart?: Date;
    dateEnd?: Date;
  }): Promise<AuditLog[]> {
    let conditions = [eq(auditLogs.companyId, companyId)];
    
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    
    if (filters?.dateStart) {
      conditions.push(gte(auditLogs.createdAt, filters.dateStart));
    }
    
    if (filters?.dateEnd) {
      conditions.push(lte(auditLogs.createdAt, filters.dateEnd));
    }

    return await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
  }

  // ============ MÉTODOS PARA RELATÓRIOS E MÉTRICAS ============

  /**
   * Calcula métricas do dia atual para o dashboard
   */
  async getTodayMetrics(companyId: string): Promise<{
    todaySales: number;
    pendingOrders: number;
    avgTicket: number;
    lowStockCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Vendas do dia
    const todayOrders = await db
      .select({
        total: orders.total,
        status: orders.status,
      })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          gte(orders.createdAt, today),
          lte(orders.createdAt, tomorrow)
        )
      );

    const todaySales = todayOrders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + parseFloat(order.total), 0);

    // Pedidos pendentes
    const pendingOrders = todayOrders.filter(
      order => order.status === 'pending' || order.status === 'preparing'
    ).length;

    // Ticket médio
    const completedOrders = todayOrders.filter(
      order => order.status === 'delivered'
    );
    const avgTicket = completedOrders.length > 0 
      ? completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0) / completedOrders.length
      : 0;

    // Produtos com estoque baixo
    const lowStockProducts = await this.getProductsByLowStock(companyId);
    const lowStockCount = lowStockProducts.length;

    return {
      todaySales,
      pendingOrders,
      avgTicket,
      lowStockCount,
    };
  }
}

// Instância singleton do storage
export const storage = new DatabaseStorage();
