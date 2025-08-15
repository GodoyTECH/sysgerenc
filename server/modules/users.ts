/**
 * GodoySys - Módulo de Usuários
 * 
 * Este módulo gerencia CRUD de usuários, alteração de senhas,
 * e operações administrativas relacionadas aos usuários da empresa.
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import type { IStorage } from "../storage";

// Schemas de validação específicos
const updateUserSchema = insertUserSchema.partial().omit({ companyId: true });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const adminPasswordSchema = z.object({
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  adminPin: z.string().length(4, "PIN deve ter 4 dígitos"),
});

/**
 * Configura as rotas de usuários
 */
export function setupUserRoutes(app: Express, storage: IStorage) {
  console.log("👥 Configurando rotas de usuários...");

  /**
   * GET /api/users
   * Lista todos os usuários da empresa
   */
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      
      const users = await storage.getUsersByCompany(companyId);
      
      // Remover senhas dos dados retornados
      const safeUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      res.json({
        users: safeUsers,
        total: safeUsers.length,
      });

    } catch (error) {
      console.error("❌ Erro ao listar usuários:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/users/:id
   * Busca um usuário específico
   */
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      const { id } = req.params;

      const user = await storage.getUser(id, companyId);
      if (!user) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        });
      }

      // Remover senha dos dados retornados
      const { password, ...safeUser } = user;

      res.json({ user: safeUser });

    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/users
   * Cria um novo usuário (apenas admins e gerentes)
   */
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões - apenas admin e manager podem criar usuários
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem criar usuários",
        });
      }

      const userData = insertUserSchema.parse({
        ...req.body,
        companyId, // Garantir que o usuário seja criado na empresa correta
      });

      // Verificar se username já existe na empresa
      const existingUser = await storage.getUserByUsername(userData.username, companyId);
      if (existingUser) {
        return res.status(400).json({
          error: "Nome de usuário já existe nesta empresa",
        });
      }

      // Criptografar senha
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Criar usuário
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'create_user',
        resource: 'users',
        resourceId: newUser.id,
        details: {
          newUserName: newUser.name,
          newUserUsername: newUser.username,
          newUserRole: newUser.role,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      // Remover senha dos dados retornados
      const { password, ...safeUser } = newUser;

      console.log(`✅ Usuário criado: ${newUser.username} | Empresa: ${companyId}`);

      res.status(201).json({
        message: "Usuário criado com sucesso",
        user: safeUser,
      });

    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      
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
   * PUT /api/users/:id
   * Atualiza um usuário existente
   */
  app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId: currentUserId } = (req as any).user;
      const { id } = req.params;

      // Verificar se o usuário existe
      const existingUser = await storage.getUser(id, companyId);
      if (!existingUser) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        });
      }

      // Verificar permissões
      const isAdmin = userRole === 'admin';
      const isManager = userRole === 'manager';
      const isOwner = currentUserId === id;

      if (!isAdmin && !isManager && !isOwner) {
        return res.status(403).json({
          error: "Acesso negado: você não tem permissão para alterar este usuário",
        });
      }

      // Se não é admin, não pode alterar role
      const updateData = updateUserSchema.parse(req.body);
      if (!isAdmin && updateData.role) {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem alterar funções",
        });
      }

      // Atualizar usuário
      const updatedUser = await storage.updateUser(id, companyId, updateData);
      if (!updatedUser) {
        return res.status(404).json({
          error: "Falha ao atualizar usuário",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId: currentUserId,
        action: 'update_user',
        resource: 'users',
        resourceId: id,
        details: {
          updatedFields: Object.keys(updateData),
          targetUser: updatedUser.username,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      // Remover senha dos dados retornados
      const { password, ...safeUser } = updatedUser;

      console.log(`✅ Usuário atualizado: ${updatedUser.username}`);

      res.json({
        message: "Usuário atualizado com sucesso",
        user: safeUser,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar usuário:", error);
      
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
   * DELETE /api/users/:id
   * Remove um usuário (soft delete)
   */
  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId: currentUserId } = (req as any).user;
      const { id } = req.params;

      // Apenas admins podem remover usuários
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem remover usuários",
        });
      }

      // Não pode remover a si mesmo
      if (currentUserId === id) {
        return res.status(400).json({
          error: "Você não pode remover sua própria conta",
        });
      }

      // Verificar se o usuário existe
      const existingUser = await storage.getUser(id, companyId);
      if (!existingUser) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        });
      }

      // Remover usuário (soft delete)
      const success = await storage.deleteUser(id, companyId);
      if (!success) {
        return res.status(500).json({
          error: "Falha ao remover usuário",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId: currentUserId,
        action: 'delete_user',
        resource: 'users',
        resourceId: id,
        details: {
          deletedUserName: existingUser.name,
          deletedUserUsername: existingUser.username,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`🗑️ Usuário removido: ${existingUser.username}`);

      res.json({
        message: "Usuário removido com sucesso",
      });

    } catch (error) {
      console.error("❌ Erro ao remover usuário:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/users/change-password
   * Altera a senha do usuário atual
   */
  app.post('/api/users/change-password', async (req: Request, res: Response) => {
    try {
      const { companyId, userId } = (req as any).user;
      
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Buscar usuário atual
      const user = await storage.getUser(userId, companyId);
      if (!user) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        });
      }

      // Verificar senha atual
      const currentPasswordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!currentPasswordMatch) {
        return res.status(400).json({
          error: "Senha atual incorreta",
        });
      }

      // Criptografar nova senha
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar senha
      await storage.updateUser(userId, companyId, {
        password: hashedNewPassword,
      });

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'change_password',
        resource: 'users',
        resourceId: userId,
        details: { selfChange: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`🔐 Senha alterada pelo usuário: ${user.username}`);

      res.json({
        message: "Senha alterada com sucesso",
      });

    } catch (error) {
      console.error("❌ Erro ao alterar senha:", error);
      
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
   * POST /api/users/:id/reset-password
   * Redefine a senha de um usuário (apenas admins com PIN)
   */
  app.post('/api/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId: currentUserId } = (req as any).user;
      const { id } = req.params;

      // Apenas admins podem redefinir senhas
      if (userRole !== 'admin') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores podem redefinir senhas",
        });
      }

      const { newPassword, adminPin } = adminPasswordSchema.parse(req.body);

      // Verificar PIN de admin
      const masterPin = process.env.ADMIN_MASTER_PIN || "1234";
      if (adminPin !== masterPin) {
        return res.status(403).json({
          error: "PIN de administrador inválido",
          code: "INVALID_ADMIN_PIN"
        });
      }

      // Verificar se o usuário existe
      const targetUser = await storage.getUser(id, companyId);
      if (!targetUser) {
        return res.status(404).json({
          error: "Usuário não encontrado",
        });
      }

      // Criptografar nova senha
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar senha
      await storage.updateUser(id, companyId, {
        password: hashedNewPassword,
      });

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId: currentUserId,
        action: 'admin_reset_password',
        resource: 'users',
        resourceId: id,
        details: {
          targetUserName: targetUser.name,
          targetUserUsername: targetUser.username,
          adminAction: true,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`🔐 Senha redefinida pelo admin para usuário: ${targetUser.username}`);

      res.json({
        message: "Senha redefinida com sucesso",
      });

    } catch (error) {
      console.error("❌ Erro ao redefinir senha:", error);
      
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

  console.log("✅ Rotas de usuários configuradas");
}
