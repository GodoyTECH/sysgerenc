// client/netlify/functions/routes/routes.ts

import type { Express } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "./storage";
import { authenticateToken, requireRole } from "./middleware/auth";
import { sendReportsEmail } from "./services/email";
import { generateReportsCSV } from "./services/reports";
import {
  insertUserSchema,
  insertCompanySchema,
  insertProductSchema,
  insertOrderSchema,
} from "../shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ADMIN_MASTER_PIN = process.env.ADMIN_MASTER_PIN || "1234";

export function attachRoutes(app: Express) {
  // ===================== AUTENTICAÇÃO =====================
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = z
        .object({
          email: z.string().email(),
          password: z.string(),
        })
        .parse(req.body);

      // busca por e-mail em vez de username
      const user = await storage.getUserByEmail(email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }
      if (!user.isActive) {
        return res.status(401).json({ message: "Usuário desativado" });
      }

      const accessToken = jwt.sign(
        { userId: user.id, companyId: user.companyId, role: user.role },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      await storage.updateUserRefreshToken(user.id, refreshToken);
      await storage.updateUserLastLogin(user.id);

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
    } catch {
      res.status(403).json({ message: "Token inválido" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      await storage.updateUserRefreshToken(req.user.userId, null);
      res.json({ message: "Logout realizado com sucesso" });
    } catch {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===================== USUÁRIOS =====================
  app.get(
    "/api/users",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        const users = await storage.getUsersByCompany(req.user.companyId);
        res.json(users);
      } catch {
        res.status(500).json({ message: "Erro ao buscar usuários" });
      }
    }
  );

  app.post(
    "/api/users",
    authenticateToken,
    requireRole(["admin"]),
    async (req, res) => {
      try {
        const userData = insertUserSchema.parse(req.body);
        userData.companyId = req.user.companyId;
        userData.password = await bcrypt.hash(userData.password, 10);

        const user = await storage.createUser(userData);
        res.status(201).json(user);
      } catch {
        res.status(400).json({ message: "Erro ao criar usuário" });
      }
    }
  );

  // ===================== EMPRESA =====================
  app.get("/api/companies/current", authenticateToken, async (req, res) => {
    try {
      const company = await storage.getCompany(req.user.companyId);
      if (!company) return res.status(404).json({ message: "Empresa não encontrada" });
      res.json(company);
    } catch {
      res.status(500).json({ message: "Erro ao buscar empresa" });
    }
  });

  // ===================== PRODUTOS =====================
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const products = await storage.getProductsByCompany(req.user.companyId);
      res.json(products);
    } catch {
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.post(
    "/api/products",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        const productData = insertProductSchema.parse(req.body);
        productData.companyId = req.user.companyId;
        const product = await storage.createProduct(productData);
        res.status(201).json(product);
      } catch {
        res.status(400).json({ message: "Erro ao criar produto" });
      }
    }
  );

  // ===================== PEDIDOS =====================
  app.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      const { status, date, limit = 50 } = req.query;
      const orders = await storage.getOrdersByCompany({
        companyId: req.user.companyId,
        status: status as string,
        date: date as string,
        limit: parseInt(limit as string),
      });
      res.json(orders);
    } catch {
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  app.post("/api/orders", authenticateToken, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      orderData.companyId = req.user.companyId;
      orderData.userId = req.user.userId;
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch {
      res.status(400).json({ message: "Erro ao criar pedido" });
    }
  });

  // ===================== CHAT =====================
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
    } catch {
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

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
      res.status(201).json(chatMessage);
    } catch {
      res.status(400).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // ===================== RELATÓRIOS =====================
  app.get("/api/reports/dashboard", authenticateToken, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.companyId);
      res.json(metrics);
    } catch {
      res.status(500).json({ message: "Erro ao buscar métricas" });
    }
  });

  app.post(
    "/api/reports/download",
    authenticateToken,
    requireRole(["admin", "manager"]),
    async (req, res) => {
      try {
        const { adminPin } = req.body;
        if (adminPin !== ADMIN_MASTER_PIN) {
          return res.status(403).json({ message: "PIN de administrador inválido" });
        }
        const user = await storage.getUser(req.user.userId);
        if (!user) return res.status(404).json({ message: "Usuário não encontrado" });
        const csvData = await generateReportsCSV(req.user.companyId);
        await sendReportsEmail(user.email, csvData);
        res.json({ message: "Relatórios enviados para seu e-mail com sucesso" });
      } catch {
        res.status(500).json({ message: "Erro ao processar relatórios" });
      }
    }
  );

  // ===================== CONFIG =====================
  app.patch(
    "/api/config/company",
    authenticateToken,
    requireRole(["admin"]),
    async (req, res) => {
      try {
        const { settings } = req.body;
        const company = await storage.updateCompanySettings(
          req.user.companyId,
          settings
        );
        res.json(company);
      } catch {
        res.status(400).json({ message: "Erro ao atualizar configurações" });
      }
    }
  );
}
