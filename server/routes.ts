/**
 * GodoySys - Sistema de Gerenciamento
 * Configuração de Rotas da API
 * 
 * Este arquivo configura todas as rotas da API REST e o servidor WebSocket
 * para funcionalidades em tempo real como chat e atualizações de pedidos.
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";

// Importar todos os módulos de rotas
import { setupAuthRoutes } from "./modules/auth";
import { setupUserRoutes } from "./modules/users";
import { setupCompanyRoutes } from "./modules/companies";
import { setupProductRoutes } from "./modules/products";
import { setupOrderRoutes } from "./modules/orders";
import { setupChatRoutes } from "./modules/chat";
import { setupReportRoutes } from "./modules/reports";

// Importar middlewares
import { authenticateToken } from "./middlewares/auth";
import { validateCompany } from "./middlewares/company";

// Importar serviços
import { setupSocketService } from "./services/socket";

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🚀 Configurando rotas da API GodoySys...");

  // ============ MIDDLEWARE GLOBAIS ============
  
  // Middleware para logging de requisições da API
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    console.log(`📝 [${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`✅ [${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
  });

  // ============ ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) ============
  
  // Rota de health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'GodoySys API',
      version: '1.0.0'
    });
  });

  // Configurar rotas de autenticação (login, register)
  setupAuthRoutes(app, storage);

  // ============ MIDDLEWARE DE AUTENTICAÇÃO ============
  // Todas as rotas abaixo requerem token JWT válido
  app.use('/api', authenticateToken);

  // ============ MIDDLEWARE DE VALIDAÇÃO DE EMPRESA ============
  // Todas as rotas abaixo requerem companyId válido no contexto
  app.use('/api', validateCompany);

  // ============ ROTAS PROTEGIDAS (COM AUTENTICAÇÃO) ============

  // Configurar rotas de usuários
  setupUserRoutes(app, storage);
  
  // Configurar rotas de empresas  
  setupCompanyRoutes(app, storage);
  
  // Configurar rotas de produtos
  setupProductRoutes(app, storage);
  
  // Configurar rotas de pedidos
  setupOrderRoutes(app, storage);
  
  // Configurar rotas de chat
  setupChatRoutes(app, storage);
  
  // Configurar rotas de relatórios
  setupReportRoutes(app, storage);

  // ============ TRATAMENTO DE ERROS ============
  
  app.use('/api/*', (req, res) => {
    res.status(404).json({ 
      error: 'Endpoint não encontrado',
      path: req.path,
      method: req.method 
    });
  });

  // ============ CONFIGURAÇÃO DO SERVIDOR HTTP E WEBSOCKET ============
  
  const httpServer = createServer(app);

  // Configurar WebSocket Server para funcionalidades em tempo real
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  // Configurar serviço de WebSocket para chat e atualizações em tempo real
  setupSocketService(wss, storage);

  console.log("✅ Rotas da API configuradas com sucesso!");
  console.log("📡 WebSocket Server configurado em /ws");
  
  return httpServer;
}
