/**
 * GodoySys - Módulo de Chat
 * 
 * Este módulo gerencia o sistema de chat interno com canais
 * (#geral, #suporte, #cozinha) e integração com WebSocket para tempo real.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertChatMessageSchema } from "@shared/schema";
import type { IStorage } from "../storage";

// Schemas de validação
const sendMessageSchema = z.object({
  channel: z.enum(['general', 'support', 'kitchen'], {
    errorMap: () => ({ message: "Canal deve ser 'general', 'support' ou 'kitchen'" })
  }),
  message: z.string().min(1, "Mensagem não pode estar vazia").max(1000, "Mensagem muito longa (máximo 1000 caracteres)"),
  metadata: z.object({}).optional(),
});

const getMessagesSchema = z.object({
  channel: z.enum(['general', 'support', 'kitchen']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  before: z.string().datetime().optional(), // Para paginação
});

/**
 * Configura as rotas de chat
 */
export function setupChatRoutes(app: Express, storage: IStorage) {
  console.log("💬 Configurando rotas de chat...");

  /**
   * GET /api/chat/messages
   * Lista mensagens de chat com filtros
   */
  app.get('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      
      const { channel, limit, before } = getMessagesSchema.parse(req.query);

      // Se não especificou canal, listar canais disponíveis
      if (!channel) {
        const channels = ['general', 'support', 'kitchen'];
        const channelData = await Promise.all(
          channels.map(async (ch) => {
            const messages = await storage.getChatMessages(companyId, ch, 1);
            return {
              channel: ch,
              lastMessage: messages[0] || null,
              displayName: {
                general: '#geral',
                support: '#suporte', 
                kitchen: '#cozinha'
              }[ch]
            };
          })
        );

        return res.json({
          channels: channelData,
        });
      }

      // Buscar mensagens do canal específico
      const messages = await storage.getChatMessages(companyId, channel, limit);

      // Filtrar por data se especificado
      let filteredMessages = messages;
      if (before) {
        const beforeDate = new Date(before);
        filteredMessages = messages.filter(msg => 
          new Date(msg.createdAt) < beforeDate
        );
      }

      res.json({
        channel,
        messages: filteredMessages,
        hasMore: messages.length === limit,
        displayName: {
          general: '#geral',
          support: '#suporte',
          kitchen: '#cozinha'
        }[channel]
      });

    } catch (error) {
      console.error("❌ Erro ao buscar mensagens:", error);
      
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
   * POST /api/chat/messages
   * Envia uma nova mensagem de chat
   */
  app.post('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const { companyId, userId } = (req as any).user;
      
      const messageData = sendMessageSchema.parse(req.body);

      // Criar mensagem
      const newMessage = await storage.createChatMessage({
        companyId,
        userId,
        channel: messageData.channel,
        message: messageData.message.trim(),
        metadata: messageData.metadata || {},
      });

      // Buscar dados do usuário para incluir na resposta
      const user = await storage.getUser(userId, companyId);
      
      const messageWithUser = {
        ...newMessage,
        user: user ? {
          id: user.id,
          name: user.name,
          role: user.role,
        } : null,
      };

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'send_chat_message',
        resource: 'chat_messages',
        resourceId: newMessage.id,
        details: {
          channel: messageData.channel,
          messageLength: messageData.message.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`💬 Mensagem enviada: ${user?.name || 'Usuário'} em #${messageData.channel}`);

      res.status(201).json({
        message: "Mensagem enviada com sucesso",
        chatMessage: messageWithUser,
      });

    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error);
      
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
   * GET /api/chat/channels
   * Lista canais disponíveis com estatísticas
   */
  app.get('/api/chat/channels', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      const channels = [
        {
          id: 'general',
          name: '#geral',
          description: 'Canal principal para conversas gerais',
          isPublic: true,
        },
        {
          id: 'support',
          name: '#suporte', 
          description: 'Canal para questões de suporte e ajuda',
          isPublic: true,
        },
        {
          id: 'kitchen',
          name: '#cozinha',
          description: 'Canal exclusivo para comunicação da cozinha',
          isPublic: false,
          roles: ['admin', 'manager', 'kitchen'],
        }
      ];

      // Buscar estatísticas de cada canal
      const channelsWithStats = await Promise.all(
        channels.map(async (channel) => {
          const recentMessages = await storage.getChatMessages(companyId, channel.id as any, 10);
          
          return {
            ...channel,
            messageCount: recentMessages.length,
            lastActivity: recentMessages[0]?.createdAt || null,
            unreadCount: 0, // TODO: Implementar contagem de mensagens não lidas por usuário
          };
        })
      );

      res.json({
        channels: channelsWithStats,
      });

    } catch (error) {
      console.error("❌ Erro ao buscar canais:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/chat/online-users
   * Lista usuários online (baseado em atividade recente)
   */
  app.get('/api/chat/online-users', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;

      // Buscar usuários que enviaram mensagens nos últimos 30 minutos
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      // TODO: Implementar uma tabela de sessões ativas para melhor tracking
      // Por enquanto, usar atividade de chat como proxy
      const recentMessages = await Promise.all([
        storage.getChatMessages(companyId, 'general', 50),
        storage.getChatMessages(companyId, 'support', 50),
        storage.getChatMessages(companyId, 'kitchen', 50),
      ]);

      const allRecentMessages = recentMessages.flat();
      const activeUserIds = new Set(
        allRecentMessages
          .filter(msg => new Date(msg.createdAt) > thirtyMinutesAgo)
          .map(msg => msg.userId)
      );

      // Buscar dados dos usuários ativos
      const allUsers = await storage.getUsersByCompany(companyId);
      const onlineUsers = allUsers
        .filter(user => user.isActive && activeUserIds.has(user.id))
        .map(user => ({
          id: user.id,
          name: user.name,
          role: user.role,
          lastSeen: thirtyMinutesAgo, // Aproximação
        }));

      res.json({
        onlineUsers,
        totalOnline: onlineUsers.length,
        lastUpdated: new Date().toISOString(),
      });

    } catch (error) {
      console.error("❌ Erro ao buscar usuários online:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * DELETE /api/chat/messages/:id
   * Remove uma mensagem (apenas admins ou autor da mensagem)
   */
  app.delete('/api/chat/messages/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, userId, role } = (req as any).user;
      const { id } = req.params;

      // TODO: Implementar soft delete de mensagens
      // Por enquanto, retornar que a funcionalidade está em desenvolvimento
      
      if (role !== 'admin') {
        return res.status(403).json({
          error: "Funcionalidade disponível apenas para administradores",
        });
      }

      // Registrar log de auditoria para tentativa de remoção
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'attempt_delete_message',
        resource: 'chat_messages',
        resourceId: id,
        details: {
          reason: 'Feature not implemented yet',
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      res.status(501).json({
        message: "Funcionalidade em desenvolvimento",
        hint: "Remoção de mensagens será implementada em versão futura",
      });

    } catch (error) {
      console.error("❌ Erro ao tentar remover mensagem:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  console.log("✅ Rotas de chat configuradas");
}
