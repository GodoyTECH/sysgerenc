/**
 * GodoySys - Módulo de Relatórios
 * 
 * Este módulo gerencia geração de relatórios, exportação em CSV
 * e envio por email de relatórios completos do sistema.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { IStorage } from "../storage";
import { sendEmail } from "../services/email";

// Schema para filtros de relatórios
const reportFiltersSchema = z.object({
  dateStart: z.string().datetime().optional(),
  dateEnd: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).default('json'),
  email: z.string().email().optional(),
});

const downloadReportSchema = z.object({
  adminPin: z.string().length(4, "PIN deve ter 4 dígitos"),
  email: z.string().email("Email inválido"),
  includeAuditLogs: z.boolean().default(false),
});

/**
 * Converte array de objetos para CSV
 */
function arrayToCSV(data: any[], headers?: string[]): string {
  if (!data.length) return '';
  
  const keys = headers || Object.keys(data[0]);
  const csvHeaders = keys.join(',');
  
  const csvRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Formata dados para relatório
 */
function formatReportData(data: any[], type: string) {
  switch (type) {
    case 'orders':
      return data.map(order => ({
        id: order.id,
        data: new Date(order.createdAt).toLocaleDateString('pt-BR'),
        hora: new Date(order.createdAt).toLocaleTimeString('pt-BR'),
        cliente: order.customerName || 'N/A',
        mesa: order.table || 'N/A',
        status: order.status,
        subtotal: `R$ ${order.subtotal}`,
        desconto: `R$ ${order.discount}`,
        total: `R$ ${order.total}`,
        itens: order.items?.length || 0,
        observacoes: order.notes || '',
      }));
      
    case 'products':
      return data.map(product => ({
        id: product.id,
        nome: product.name,
        categoria: product.category?.name || 'Sem categoria',
        preco: `R$ ${product.price}`,
        custo: product.cost ? `R$ ${product.cost}` : 'N/A',
        estoque: product.stock,
        estoqueMinimo: product.minStock,
        ativo: product.isActive ? 'Sim' : 'Não',
        criadoEm: new Date(product.createdAt).toLocaleDateString('pt-BR'),
      }));
      
    case 'users':
      return data.map(user => ({
        id: user.id,
        nome: user.name,
        email: user.email,
        usuario: user.username,
        funcao: user.role,
        ativo: user.isActive ? 'Sim' : 'Não',
        ultimoLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : 'Nunca',
        criadoEm: new Date(user.createdAt).toLocaleDateString('pt-BR'),
      }));
      
    default:
      return data;
  }
}

/**
 * Configura as rotas de relatórios
 */
export function setupReportRoutes(app: Express, storage: IStorage) {
  console.log("📊 Configurando rotas de relatórios...");

  /**
   * GET /api/reports/sales
   * Relatório de vendas
   */
  app.get('/api/reports/sales', async (req: Request, res: Response) => {
    try {
      const { companyId, role } = (req as any).user;

      // Verificar permissões
      if (!['admin', 'manager'].includes(role)) {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem acessar relatórios",
        });
      }

      const filters = reportFiltersSchema.parse(req.query);
      
      // Definir período padrão (últimos 30 dias)
      const endDate = filters.dateEnd ? new Date(filters.dateEnd) : new Date();
      const startDate = filters.dateStart ? new Date(filters.dateStart) : (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
      })();

      // Buscar pedidos do período
      const orders = await storage.getOrders(companyId, {
        dateStart: startDate,
        dateEnd: endDate,
      });

      // Filtrar pedidos completados
      const completedOrders = orders.filter(order => 
        ['delivered'].includes(order.status)
      );

      // Calcular métricas
      const totalSales = completedOrders.reduce((sum, order) => 
        sum + parseFloat(order.total), 0
      );
      
      const totalOrders = completedOrders.length;
      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // Vendas por dia
      const salesByDay = completedOrders.reduce((acc: any, order) => {
        const date = new Date(order.createdAt).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { date, sales: 0, orders: 0 };
        }
        acc[date].sales += parseFloat(order.total);
        acc[date].orders += 1;
        return acc;
      }, {});

      const reportData = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalSales: totalSales.toFixed(2),
          totalOrders,
          averageTicket: averageTicket.toFixed(2),
          cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        },
        salesByDay: Object.values(salesByDay),
        orders: formatReportData(completedOrders, 'orders'),
      };

      if (filters.format === 'csv') {
        const csvData = arrayToCSV(reportData.orders);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio-vendas.csv');
        return res.send(csvData);
      }

      res.json(reportData);

    } catch (error) {
      console.error("❌ Erro ao gerar relatório de vendas:", error);
      
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
   * GET /api/reports/products
   * Relatório de produtos e estoque
   */
  app.get('/api/reports/products', async (req: Request, res: Response) => {
    try {
      const { companyId, role } = (req as any).user;

      if (!['admin', 'manager'].includes(role)) {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem acessar relatórios",
        });
      }

      const filters = reportFiltersSchema.parse(req.query);

      // Buscar produtos e categorias
      const products = await storage.getProducts(companyId);
      const categories = await storage.getProductCategories(companyId);
      const lowStockProducts = await storage.getProductsByLowStock(companyId);

      // Estatísticas
      const activeProducts = products.filter(p => p.isActive);
      const totalValue = products.reduce((sum, product) => {
        const cost = parseFloat(product.cost || '0');
        return sum + (cost * product.stock);
      }, 0);

      const reportData = {
        summary: {
          totalProducts: products.length,
          activeProducts: activeProducts.length,
          totalCategories: categories.length,
          lowStockProducts: lowStockProducts.length,
          totalStockValue: totalValue.toFixed(2),
        },
        lowStock: formatReportData(lowStockProducts, 'products'),
        products: formatReportData(products, 'products'),
        categories: categories.map(cat => ({
          id: cat.id,
          nome: cat.name,
          descricao: cat.description || '',
          produtos: products.filter(p => p.categoryId === cat.id).length,
        })),
      };

      if (filters.format === 'csv') {
        const csvData = arrayToCSV(reportData.products);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio-produtos.csv');
        return res.send(csvData);
      }

      res.json(reportData);

    } catch (error) {
      console.error("❌ Erro ao gerar relatório de produtos:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/reports/dashboard
   * Relatório resumido para dashboard
   */
  app.get('/api/reports/dashboard', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      // Buscar métricas do dia
      const todayMetrics = await storage.getTodayMetrics(companyId);
      
      // Buscar dados dos últimos 7 dias para gráficos
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const weekOrders = await storage.getOrders(companyId, {
        dateStart: sevenDaysAgo,
      });

      // Vendas por dia (últimos 7 dias)
      const salesByDay = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayOrders = weekOrders.filter(order => {
          const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
          return orderDate === dateString && order.status !== 'cancelled';
        });
        
        const daySales = dayOrders.reduce((sum, order) => 
          sum + parseFloat(order.total), 0
        );
        
        salesByDay.push({
          date: dateString,
          sales: daySales,
          orders: dayOrders.length,
          formattedDate: date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit' 
          }),
        });
      }

      res.json({
        todayMetrics,
        salesByDay,
        weekSummary: {
          totalSales: salesByDay.reduce((sum, day) => sum + day.sales, 0),
          totalOrders: salesByDay.reduce((sum, day) => sum + day.orders, 0),
          averageDailySales: salesByDay.reduce((sum, day) => sum + day.sales, 0) / 7,
        },
        lastUpdated: new Date().toISOString(),
      });

    } catch (error) {
      console.error("❌ Erro ao gerar relatório do dashboard:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/reports/download
   * Gera relatório completo em CSV e envia por email
   */
  app.post('/api/reports/download', async (req: Request, res: Response) => {
    try {
      const { companyId, role, userId } = (req as any).user;

      // Apenas admins podem baixar relatórios completos
      if (role !== 'admin') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem baixar relatórios completos",
        });
      }

      const { adminPin, email, includeAuditLogs } = downloadReportSchema.parse(req.body);

      // Verificar PIN de admin
      const masterPin = process.env.ADMIN_MASTER_PIN || "1234";
      if (adminPin !== masterPin) {
        return res.status(403).json({
          error: "PIN de administrador inválido",
          code: "INVALID_ADMIN_PIN"
        });
      }

      // Buscar dados da empresa
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      console.log(`📊 Iniciando geração de relatório completo para ${company.name}...`);

      // Buscar todos os dados
      const [orders, products, users, categories] = await Promise.all([
        storage.getOrders(companyId),
        storage.getProducts(companyId),
        storage.getUsersByCompany(companyId),
        storage.getProductCategories(companyId),
      ]);

      let auditLogs: any[] = [];
      if (includeAuditLogs) {
        auditLogs = await storage.getAuditLogs(companyId);
      }

      // Gerar CSVs
      const csvReports = {
        pedidos: arrayToCSV(formatReportData(orders, 'orders')),
        produtos: arrayToCSV(formatReportData(products, 'products')),
        usuarios: arrayToCSV(formatReportData(users, 'users')),
        categorias: arrayToCSV(categories.map(cat => ({
          id: cat.id,
          nome: cat.name,
          descricao: cat.description || '',
          criadoEm: new Date(cat.createdAt).toLocaleDateString('pt-BR'),
        }))),
      };

      if (includeAuditLogs) {
        csvReports['logs_auditoria'] = arrayToCSV(auditLogs.map(log => ({
          id: log.id,
          usuario: log.userId || 'Sistema',
          acao: log.action,
          recurso: log.resource,
          detalhes: JSON.stringify(log.details),
          ip: log.ipAddress || 'N/A',
          data: new Date(log.createdAt).toLocaleString('pt-BR'),
        })));
      }

      // Preparar dados para email
      const reportDate = new Date().toLocaleDateString('pt-BR');
      const emailData = {
        companyName: company.name,
        reportDate,
        summary: {
          totalOrders: orders.length,
          totalProducts: products.length,
          totalUsers: users.length,
          completedOrders: orders.filter(o => o.status === 'delivered').length,
          totalSales: orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, order) => sum + parseFloat(order.total), 0)
            .toFixed(2),
        },
        csvReports,
      };

      // Enviar email
      await sendEmail({
        to: email,
        subject: `GodoySys - Relatórios Completos - ${company.name} - ${reportDate}`,
        type: 'reports',
        data: emailData,
      });

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'download_complete_reports',
        resource: 'reports',
        details: {
          emailSent: email,
          includeAuditLogs,
          reportCount: Object.keys(csvReports).length,
          companyName: company.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Relatório completo enviado para ${email}`);

      res.json({
        message: "Relatórios gerados e enviados por email com sucesso",
        summary: emailData.summary,
        emailSent: email,
        reportsGenerated: Object.keys(csvReports),
      });

    } catch (error) {
      console.error("❌ Erro ao gerar relatório completo:", error);
      
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

  console.log("✅ Rotas de relatórios configuradas");
}
