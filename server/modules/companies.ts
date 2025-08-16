/**
 * GodoySys - Módulo de Empresas
 * 
 * Este módulo gerencia informações da empresa, configurações
 * e operações administrativas relacionadas ao tenant atual.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertCompanySchema } from "../../shared/schema";
import type { IStorage } from "../storage";

// Schema para atualização de empresa (todos os campos opcionais)
const updateCompanySchema = insertCompanySchema.partial();

// Schema para configurações específicas
const companySettingsSchema = z.object({
  currency: z.string().default("BRL"),
  timezone: z.string().default("America/Sao_Paulo"),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  }).default({ start: "08:00", end: "18:00" }),
  features: z.array(z.string()).default([]),
});

/**
 * Configura as rotas de empresas
 */
export function setupCompanyRoutes(app: Express, storage: IStorage) {
  console.log("🏢 Configurando rotas de empresas...");

  /**
   * GET /api/company
   * Retorna informações da empresa atual
   */
  app.get('/api/company', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      res.json({
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          settings: company.settings || {},
          createdAt: company.createdAt,
          updatedAt: company.updatedAt,
        },
      });

    } catch (error) {
      console.error("❌ Erro ao buscar empresa:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/company
   * Atualiza informações da empresa (apenas admins e gerentes)
   */
  app.put('/api/company', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões - apenas admin e manager podem alterar empresa
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem alterar dados da empresa",
        });
      }

      const updateData = updateCompanySchema.parse(req.body);

      // Verificar se a empresa existe
      const existingCompany = await storage.getCompany(companyId);
      if (!existingCompany) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      // Atualizar empresa
      const updatedCompany = await storage.updateCompany(companyId, updateData);
      if (!updatedCompany) {
        return res.status(500).json({
          error: "Falha ao atualizar empresa",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_company',
        resource: 'companies',
        resourceId: companyId,
        details: {
          updatedFields: Object.keys(updateData),
          companyName: updatedCompany.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Empresa atualizada: ${updatedCompany.name}`);

      res.json({
        message: "Empresa atualizada com sucesso",
        company: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          email: updatedCompany.email,
          phone: updatedCompany.phone,
          address: updatedCompany.address,
          settings: updatedCompany.settings || {},
          updatedAt: updatedCompany.updatedAt,
        },
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar empresa:", error);
      
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
   * PUT /api/company/settings
   * Atualiza configurações específicas da empresa
   */
  app.put('/api/company/settings', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões - apenas admin pode alterar configurações
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem alterar configurações da empresa",
        });
      }

      const settings = companySettingsSchema.parse(req.body);

      // Buscar empresa atual para manter outros dados
      const existingCompany = await storage.getCompany(companyId);
      if (!existingCompany) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      // Atualizar apenas as configurações
      const updatedCompany = await storage.updateCompany(companyId, {
        settings: {
          ...existingCompany.settings,
          ...settings,
        },
      });

      if (!updatedCompany) {
        return res.status(500).json({
          error: "Falha ao atualizar configurações",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_company_settings',
        resource: 'companies',
        resourceId: companyId,
        details: {
          newSettings: settings,
          companyName: updatedCompany.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`⚙️ Configurações da empresa atualizadas: ${updatedCompany.name}`);

      res.json({
        message: "Configurações atualizadas com sucesso",
        settings: updatedCompany.settings,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar configurações:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Configurações inválidas",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/company/stats
   * Retorna estatísticas gerais da empresa
   */
  app.get('/api/company/stats', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      // Buscar métricas do dia
      const metrics = await storage.getTodayMetrics(companyId);

      // Buscar totais gerais
      const users = await storage.getUsersByCompany(companyId);
      const products = await storage.getProducts(companyId);
      const categories = await storage.getProductCategories(companyId);

      // Calcular estatísticas adicionais
      const activeUsers = users.filter(user => user.isActive).length;
      const activeProducts = products.filter(product => product.isActive).length;

      res.json({
        metrics: {
          ...metrics,
          totalUsers: users.length,
          activeUsers,
          totalProducts: products.length,
          activeProducts,
          totalCategories: categories.length,
        },
        summary: {
          usersDistribution: {
            admin: users.filter(u => u.role === 'admin').length,
            manager: users.filter(u => u.role === 'manager').length,
            attendant: users.filter(u => u.role === 'attendant').length,
            kitchen: users.filter(u => u.role === 'kitchen').length,
          },
        },
      });

    } catch (error) {
      console.error("❌ Erro ao buscar estatísticas:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/company/audit-logs
   * Retorna logs de auditoria da empresa (apenas admins)
   */
  app.get('/api/company/audit-logs', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole } = (req as any).user;

      // Apenas admins podem ver logs de auditoria
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem ver logs de auditoria",
        });
      }

      // Parâmetros de filtro opcionais
      const { action, userId: filterUserId, dateStart, dateEnd } = req.query;
      
      const filters: any = {};
      
      if (action) filters.action = action as string;
      if (filterUserId) filters.userId = filterUserId as string;
      if (dateStart) filters.dateStart = new Date(dateStart as string);
      if (dateEnd) filters.dateEnd = new Date(dateEnd as string);

      const auditLogs = await storage.getAuditLogs(companyId, filters);

      res.json({
        auditLogs,
        total: auditLogs.length,
        filters: filters,
      });

    } catch (error) {
      console.error("❌ Erro ao buscar logs de auditoria:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  console.log("✅ Rotas de empresas configuradas");
}
