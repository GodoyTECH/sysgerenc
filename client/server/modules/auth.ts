/**
 * GodoySys - Módulo de Autenticação
 *
 * Gerencia login, logout, renovação de tokens JWT
 * e validação de credenciais com suporte multi-tenant.
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs"; // alterado para bcryptjs (compatível serverless)
import jwt from "jsonwebtoken";
import { z } from "zod";
import { loginSchema } from "../../shared/schema";
import type { IStorage } from "../storage";

// Schema para renovação de token
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Token de renovação é obrigatório"),
});

// Tipos para o payload do JWT
interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
  username: string;
  exp?: number;
  iat?: number;
}

/**
 * Gera tokens JWT (access e refresh)
 */
function generateTokens(
  userId: string,
  companyId: string,
  role: string,
  username: string
) {
  const jwtSecret = process.env.JWT_SECRET || "dev_secret_key";

  const payload = { userId, companyId, role, username };

  const accessToken = jwt.sign(payload, jwtSecret, {
    expiresIn: "1h",
    issuer: "godoy-sys",
    audience: "godoy-sys-users",
  });

  const refreshToken = jwt.sign(payload, jwtSecret, {
    expiresIn: "7d",
    issuer: "godoy-sys",
    audience: "godoy-sys-users",
  });

  return { accessToken, refreshToken };
}

/**
 * Verifica se um token JWT é válido
 */
function verifyToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || "dev_secret_key";
    return jwt.verify(token, jwtSecret) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Configura as rotas de autenticação
 */
export function setupAuthRoutes(app: Express, storage: IStorage) {
  console.log("🔐 Configurando rotas de autenticação...");

  /**
   * POST /api/auth/login
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const { username, password, companyId } = loginData;

      console.log(
        `🔍 Tentativa de login: ${username} | Empresa: ${companyId || "não enviada"}`
      );

      if (!companyId) {
        return res.status(400).json({
          error: "ID da empresa é obrigatório",
          code: "COMPANY_ID_REQUIRED",
        });
      }

      const user = await storage.getUserByUsername(username, companyId);

      if (!user || !user.isActive) {
        console.log(`❌ Usuário não encontrado ou inativo: ${username}`);
        return res.status(401).json({
          error: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS",
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        console.log(`❌ Senha incorreta para usuário: ${username}`);
        return res.status(401).json({
          error: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS",
        });
      }

      await storage.updateUser(user.id, user.companyId, {
        lastLogin: new Date(),
      });

      const tokens = generateTokens(
        user.id,
        user.companyId,
        user.role,
        user.username
      );

      await storage.createAuditLog({
        companyId: user.companyId,
        userId: user.id,
        action: "login",
        resource: "auth",
        details: {
          username: user.username,
          ip: req.ip,
          userAgent: req.get("User-Agent") || "unknown",
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "unknown",
      });

      console.log(
        `✅ Login bem-sucedido: ${username} | Empresa: ${user.companyId}`
      );

      return res.json({
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          companyId: user.companyId,
        },
        tokens,
      });
    } catch (error) {
      console.error("❌ Erro no login:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  /**
   * POST /api/auth/refresh
   */
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);

      const payload = verifyToken(refreshToken);
      if (!payload) {
        return res.status(401).json({
          error: "Token de renovação inválido",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      const user = await storage.getUser(payload.userId, payload.companyId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: "Usuário não encontrado ou inativo",
          code: "USER_INACTIVE",
        });
      }

      const newTokens = generateTokens(
        user.id,
        user.companyId,
        user.role,
        user.username
      );

      console.log(`🔄 Token renovado para usuário: ${user.username}`);

      return res.json({
        message: "Token renovado com sucesso",
        tokens: newTokens,
      });
    } catch (error) {
      console.error("❌ Erro na renovação de token:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const userInfo = (req as any).user;

      if (userInfo) {
        await storage.createAuditLog({
          companyId: userInfo.companyId,
          userId: userInfo.userId,
          action: "logout",
          resource: "auth",
          details: {
            username: userInfo.username,
            ip: req.ip,
            userAgent: req.get("User-Agent") || "unknown",
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || "unknown",
        });

        console.log(`👋 Logout realizado: ${userInfo.username}`);
      }

      return res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("❌ Erro no logout:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  /**
   * GET /api/auth/me
   */
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const userInfo = (req as any).user;

      const user = await storage.getUser(userInfo.userId, userInfo.companyId);
      if (!user || !user.isActive) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const company = await storage.getCompany(user.companyId);

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        company: company
          ? { id: company.id, name: company.name, email: company.email }
          : null,
      });
    } catch (error) {
      console.error("❌ Erro ao buscar perfil do usuário:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  console.log("✅ Rotas de autenticação configuradas");
}

export { verifyToken, generateTokens };

