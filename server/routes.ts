import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "./storage";
import { authenticateToken, requireRole } from "./middleware/auth";
import { setupWebSocket } from "./services/socket";
import { sendReportsEmail } from "./services/email";
import { generateReportsCSV } from "./services/reports";
import { insertUserSchema, insertCompanySchema, insertProductSchema, insertOrderSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ADMIN_MASTER_PIN = process.env.ADMIN_MASTER_PIN || "1234";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configurar WebSocket para atualizações em tempo real
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  setupWebSocket(wss);

  // ===================== ROTAS DE AUTENTICAÇÃO =====================
  
  // Login do usuário
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Usuário desativado" });
      }

      // Gerar tokens JWT
      const accessToken = jwt.sign(
        { userId: user.id, companyId: user.companyId, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Salvar refresh token no banco
      await storage.updateUserRefreshToken(user.id, refreshToken);

      // Atualizar último login
      await storage.updateUserLastLogin(user.id);

      // Log de auditoria
      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "login",
        resource: "auth",
        details: { username },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(400).json({ message: "Dados inválidos" });
    }
  });

  // Refresh token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(401).json({ message: "Token de refresh necessário" });
      }

      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string };
      const user = await storage.getUser(decoded.userId);

      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: "Token inválido" });
      }

      const newAccessToken = jwt.sign(
        { userId: user.id, companyId: user.companyId, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(403).json({ message: "Token inválido" });
    }
  });

  // Logout
  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      await storage.updateUserRefreshToken(req.user.userId, null);
      
      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "logout",
        resource: "auth",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===================== ROTAS DE USUÁRIOS =====================
  
  // Listar usuários da empresa
  app.get("/api/users", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const users = await storage.getUsersByCompany(req.user.companyId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Criar usuário
  app.post("/api/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      userData.companyId = req.user.companyId;
      
      // Hash da senha
      userData.password = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser(userData);
      
      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "create",
        resource: "user",
        resourceId: user.id,
        details: { username: user.username, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Erro ao criar usuário" });
    }
  });

  // ===================== ROTAS DE EMPRESAS =====================
  
  // Obter dados da empresa atual
  app.get("/api/companies/current", authenticateToken, async (req, res) => {
    try {
      const company = await storage.getCompany(req.user.companyId);
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar empresa" });
    }
  });

  // ===================== ROTAS DE PRODUTOS =====================
  
  // Listar produtos
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const products = await storage.getProductsByCompany(req.user.companyId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  // Criar produto
  app.post("/api/products", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      productData.companyId = req.user.companyId;

      const product = await storage.createProduct(productData);
      
      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "create",
        resource: "product",
        resourceId: product.id,
        details: { name: product.name, price: product.price },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Erro ao criar produto" });
    }
  });

  // Importar produtos via CSV
  app.post("/api/products/import", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      const { products } = req.body;
      const importedProducts = [];

      for (const productData of products) {
        productData.companyId = req.user.companyId;
        const product = await storage.createProduct(productData);
        importedProducts.push(product);
      }

      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "import",
        resource: "products",
        details: { count: importedProducts.length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: `${importedProducts.length} produtos importados com sucesso` });
    } catch (error) {
      res.status(400).json({ message: "Erro ao importar produtos" });
    }
  });

  // ===================== ROTAS DE PEDIDOS =====================
  
  // Listar pedidos
  app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      const { status, date, limit = 50 } = req.query;
      const filters = { 
        companyId: req.user.companyId,
        status: status as string,
        date: date as string,
        limit: parseInt(limit as string)
      };

      const orders = await storage.getOrdersByCompany(filters);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // Criar pedido
  app.post("/api/orders", authenticateToken, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      orderData.companyId = req.user.companyId;
      orderData.userId = req.user.userId;

      const order = await storage.createOrder(orderData);
      
      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "create",
        resource: "order",
        resourceId: order.id,
        details: { total: order.total, customerName: order.customerName },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Notificar via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: "NEW_ORDER",
            data: order
          }));
        }
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Erro ao criar pedido" });
    }
  });

  // Atualizar status do pedido
  app.patch("/api/orders/:id/status", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await storage.updateOrderStatus(id, status, req.user.companyId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "update_status",
        resource: "order",
        resourceId: id,
        details: { status },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Notificar via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "ORDER_STATUS_UPDATE",
            data: order
          }));
        }
      });

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Erro ao atualizar pedido" });
    }
  });

  // ===================== ROTAS DE CHAT =====================
  
  // Obter mensagens do chat
  app.get("/api/chat/:channel", authenticateToken, async (req, res) => {
    try {
      const { channel } = req.params;
      const { limit = 50 } = req.query;

      const messages = await storage.getChatMessages(
        req.user.companyId, 
        channel, 
        parseInt(limit as string)
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // Enviar mensagem do chat
  app.post("/api/chat/:channel", authenticateToken, async (req, res) => {
    try {
      const { channel } = req.params;
      const { message } = req.body;

      const chatMessage = await storage.createChatMessage({
        companyId: req.user.companyId,
        userId: req.user.userId,
        channel,
        message,
      });

      // Notificar via WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: "CHAT_MESSAGE",
            data: chatMessage
          }));
        }
      });

      res.status(201).json(chatMessage);
    } catch (error) {
      res.status(400).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // ===================== ROTAS DE RELATÓRIOS =====================
  
  // Obter métricas do dashboard
  app.get("/api/reports/dashboard", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.companyId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  });

  // Download de relatórios em CSV e envio por e-mail
  app.post("/api/reports/download", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
    try {
      // Verificar PIN de administrador
      const { adminPin } = req.body;
      if (adminPin !== ADMIN_MASTER_PIN) {
        return res.status(403).json({ message: "PIN de administrador inválido" });
      }

      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Gerar relatórios em CSV
      const csvData = await generateReportsCSV(req.user.companyId);
      
      // Enviar por e-mail
      await sendReportsEmail(user.email, csvData);

      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "download_reports",
        resource: "reports",
        details: { format: "csv", email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Relatórios enviados para seu e-mail com sucesso" });
    } catch (error) {
      console.error("Erro ao processar relatórios:", error);
      res.status(500).json({ message: "Erro ao processar relatórios" });
    }
  });

  // ===================== ROTAS DE CONFIGURAÇÃO =====================
  
  // Atualizar configurações da empresa
  app.patch("/api/config/company", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const { settings } = req.body;
      const company = await storage.updateCompanySettings(req.user.companyId, settings);

      await storage.createAuditLog({
        companyId: req.user.companyId,
        userId: req.user.userId,
        action: "update_settings",
        resource: "company",
        details: settings,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Erro ao atualizar configurações" });
    }
  });

  return httpServer;
}
