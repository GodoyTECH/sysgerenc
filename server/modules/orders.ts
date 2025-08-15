/**
 * GodoySys - Módulo de Pedidos
 * 
 * Este módulo gerencia CRUD de pedidos, atualizações de status,
 * cálculos de preços e integração com o sistema de cozinha.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertOrderSchema } from "@shared/schema";
import type { IStorage } from "../storage";

// Schemas de validação específicos
const updateOrderSchema = insertOrderSchema.partial().omit({ 
  companyId: true, 
  userId: true,
  createdAt: true 
});

const orderStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']),
  notes: z.string().optional(),
});

const orderFiltersSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']).optional(),
  dateStart: z.string().datetime().optional(),
  dateEnd: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const orderItemSchema = z.object({
  productId: z.string().uuid("ID do produto inválido"),
  quantity: z.number().min(1, "Quantidade deve ser pelo menos 1"),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1, "Nome do cliente é obrigatório").optional(),
  customerPhone: z.string().optional(),
  table: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Pedido deve ter pelo menos um item"),
  notes: z.string().optional(),
  discount: z.number().min(0).default(0),
});

/**
 * Configura as rotas de pedidos
 */
export function setupOrderRoutes(app: Express, storage: IStorage) {
  console.log("🧾 Configurando rotas de pedidos...");

  /**
   * GET /api/orders
   * Lista pedidos com filtros opcionais
   */
  app.get('/api/orders', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      
      const filters = orderFiltersSchema.parse(req.query);
      
      const queryFilters: any = {};
      if (filters.status) queryFilters.status = filters.status;
      if (filters.userId) queryFilters.userId = filters.userId;
      if (filters.dateStart) queryFilters.dateStart = new Date(filters.dateStart);
      if (filters.dateEnd) queryFilters.dateEnd = new Date(filters.dateEnd);

      const orders = await storage.getOrders(companyId, queryFilters);

      // Aplicar paginação manualmente (idealmente seria no banco)
      const paginatedOrders = orders.slice(filters.offset, filters.offset + filters.limit);

      res.json({
        orders: paginatedOrders,
        pagination: {
          total: orders.length,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: orders.length > filters.offset + filters.limit,
        },
        filters: queryFilters,
      });

    } catch (error) {
      console.error("❌ Erro ao listar pedidos:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Parâmetros inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/orders/:id
   * Busca um pedido específico
   */
  app.get('/api/orders/:id', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      const { id } = req.params;

      const order = await storage.getOrder(id, companyId);
      if (!order) {
        return res.status(404).json({
          error: "Pedido não encontrado",
        });
      }

      res.json({ order });

    } catch (error) {
      console.error("❌ Erro ao buscar pedido:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/orders
   * Cria um novo pedido
   */
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const { companyId, userId } = (req as any).user;
      
      const orderData = createOrderSchema.parse(req.body);

      // Calcular preços dos itens
      let subtotal = 0;
      const processedItems = [];

      for (const item of orderData.items) {
        const product = await storage.getProduct(item.productId, companyId);
        if (!product || !product.isActive) {
          return res.status(400).json({
            error: `Produto não encontrado ou inativo: ${item.productId}`,
          });
        }

        // Verificar estoque
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}, solicitado: ${item.quantity}`,
          });
        }

        const itemPrice = parseFloat(product.price);
        const itemSubtotal = itemPrice * item.quantity;
        subtotal += itemSubtotal;

        processedItems.push({
          productId: product.id,
          name: product.name,
          price: itemPrice,
          quantity: item.quantity,
          notes: item.notes,
        });
      }

      // Calcular total com desconto
      const discount = orderData.discount || 0;
      const total = subtotal - discount;

      if (total < 0) {
        return res.status(400).json({
          error: "Desconto não pode ser maior que o subtotal",
        });
      }

      // Criar pedido
      const newOrder = await storage.createOrder({
        companyId,
        userId,
        customerName: orderData.customerName || null,
        customerPhone: orderData.customerPhone || null,
        table: orderData.table || null,
        status: 'pending',
        items: processedItems,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes: orderData.notes || null,
      });

      // Atualizar estoque dos produtos
      for (const item of orderData.items) {
        const product = await storage.getProduct(item.productId, companyId);
        if (product) {
          await storage.updateProduct(item.productId, companyId, {
            stock: product.stock - item.quantity,
          });
        }
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'create_order',
        resource: 'orders',
        resourceId: newOrder.id,
        details: {
          customerName: newOrder.customerName,
          table: newOrder.table,
          total: newOrder.total,
          itemsCount: processedItems.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Pedido criado: ${newOrder.id} | Cliente: ${newOrder.customerName || 'N/A'} | Total: R$ ${newOrder.total}`);

      res.status(201).json({
        message: "Pedido criado com sucesso",
        order: newOrder,
      });

    } catch (error) {
      console.error("❌ Erro ao criar pedido:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/orders/:id
   * Atualiza um pedido existente
   */
  app.put('/api/orders/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, userId } = (req as any).user;
      const { id } = req.params;

      const existingOrder = await storage.getOrder(id, companyId);
      if (!existingOrder) {
        return res.status(404).json({
          error: "Pedido não encontrado",
        });
      }

      // Não permitir alteração se pedido já foi entregue ou cancelado
      if (['delivered', 'cancelled'].includes(existingOrder.status)) {
        return res.status(400).json({
          error: "Não é possível alterar pedidos entregues ou cancelados",
        });
      }

      const updateData = updateOrderSchema.parse(req.body);

      const updatedOrder = await storage.updateOrder(id, companyId, updateData);
      if (!updatedOrder) {
        return res.status(500).json({
          error: "Falha ao atualizar pedido",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_order',
        resource: 'orders',
        resourceId: id,
        details: {
          updatedFields: Object.keys(updateData),
          orderStatus: updatedOrder.status,
          customerName: updatedOrder.customerName,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Pedido atualizado: ${id}`);

      res.json({
        message: "Pedido atualizado com sucesso",
        order: updatedOrder,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar pedido:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/orders/:id/status
   * Atualiza apenas o status de um pedido
   */
  app.put('/api/orders/:id/status', async (req: Request, res: Response) => {
    try {
      const { companyId, userId, role } = (req as any).user;
      const { id } = req.params;

      const { status, notes } = orderStatusSchema.parse(req.body);

      const existingOrder = await storage.getOrder(id, companyId);
      if (!existingOrder) {
        return res.status(404).json({
          error: "Pedido não encontrado",
        });
      }

      // Verificar permissões baseadas no status e role
      if (status === 'preparing' && !['admin', 'manager', 'kitchen'].includes(role)) {
        return res.status(403).json({
          error: "Apenas cozinha pode marcar pedidos como 'preparando'",
        });
      }

      if (status === 'ready' && !['admin', 'manager', 'kitchen'].includes(role)) {
        return res.status(403).json({
          error: "Apenas cozinha pode marcar pedidos como 'prontos'",
        });
      }

      // Validar transições de status
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['delivered'],
        'delivered': [], // Status final
        'cancelled': [], // Status final
      };

      if (!validTransitions[existingOrder.status]?.includes(status)) {
        return res.status(400).json({
          error: `Transição de status inválida: ${existingOrder.status} → ${status}`,
        });
      }

      // Atualizar status
      const updateData: any = { status };
      if (notes) {
        updateData.notes = existingOrder.notes 
          ? `${existingOrder.notes}\n[${new Date().toLocaleString()}] ${notes}`
          : `[${new Date().toLocaleString()}] ${notes}`;
      }

      const updatedOrder = await storage.updateOrder(id, companyId, updateData);

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_order_status',
        resource: 'orders',
        resourceId: id,
        details: {
          previousStatus: existingOrder.status,
          newStatus: status,
          customerName: existingOrder.customerName,
          statusNotes: notes,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`🔄 Status do pedido alterado: ${id} | ${existingOrder.status} → ${status}`);

      res.json({
        message: "Status do pedido atualizado com sucesso",
        order: updatedOrder,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar status do pedido:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/orders/kitchen/display
   * Endpoint especial para tela da cozinha
   */
  app.get('/api/orders/kitchen/display', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      // Buscar pedidos pendentes e em preparação
      const pendingOrders = await storage.getOrders(companyId, { 
        status: 'pending' 
      });
      
      const preparingOrders = await storage.getOrders(companyId, { 
        status: 'preparing' 
      });

      const kitchenOrders = [...pendingOrders, ...preparingOrders]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Formatar dados para display da cozinha
      const displayData = kitchenOrders.map(order => ({
        id: order.id,
        customerName: order.customerName,
        table: order.table,
        status: order.status,
        items: order.items,
        notes: order.notes,
        createdAt: order.createdAt,
        waitingTime: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)), // em minutos
      }));

      res.json({
        orders: displayData,
        summary: {
          pending: pendingOrders.length,
          preparing: preparingOrders.length,
          total: displayData.length,
        },
        lastUpdated: new Date().toISOString(),
      });

    } catch (error) {
      console.error("❌ Erro ao buscar dados da cozinha:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/orders/stats/today
   * Estatísticas de pedidos do dia atual
   */
  app.get('/api/orders/stats/today', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayOrders = await storage.getOrders(companyId, {
        dateStart: today,
        dateEnd: tomorrow,
      });

      // Calcular estatísticas
      const stats = {
        total: todayOrders.length,
        pending: todayOrders.filter(o => o.status === 'pending').length,
        preparing: todayOrders.filter(o => o.status === 'preparing').length,
        ready: todayOrders.filter(o => o.status === 'ready').length,
        delivered: todayOrders.filter(o => o.status === 'delivered').length,
        cancelled: todayOrders.filter(o => o.status === 'cancelled').length,
        totalSales: todayOrders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, order) => sum + parseFloat(order.total), 0),
        averageTicket: 0,
      };

      const completedOrders = todayOrders.filter(o => o.status === 'delivered');
      if (completedOrders.length > 0) {
        stats.averageTicket = completedOrders.reduce((sum, order) => sum + parseFloat(order.total), 0) / completedOrders.length;
      }

      res.json({
        date: today.toISOString().split('T')[0],
        stats,
        orders: todayOrders,
      });

    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas do dia:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  console.log("✅ Rotas de pedidos configuradas");
}
