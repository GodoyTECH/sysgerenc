/**
 * GodoySys - Middleware de Autenticação
 * 
 * Este middleware valida tokens JWT e adiciona informações
 * do usuário autenticado no objeto de requisição.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Interface para o payload do JWT
interface JWTPayload {
  userId: string;
  companyId: string;
  role: string;
  username: string;
  exp?: number;
  iat?: number;
}

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona dados do usuário na requisição
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // Verificar se a rota é pública (não requer autenticação)
  const publicRoutes = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/refresh',
  ];

  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
  if (isPublicRoute) {
    return next();
  }

  // Extrair token do header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: "Token de acesso requerido",
      code: "MISSING_TOKEN"
    });
  }

  const token = authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"
  if (!token) {
    return res.status(401).json({
      error: "Formato de token inválido",
      code: "INVALID_TOKEN_FORMAT"
    });
  }

  try {
    // Verificar e decodificar token
    const jwtSecret = process.env.JWT_SECRET || "dev_secret_key";
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Verificar se o token não expirou
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: "Token expirado",
        code: "TOKEN_EXPIRED"
      });
    }

    // Adicionar informações do usuário na requisição
    (req as any).user = {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
      username: decoded.username,
    };

    console.log(`🔐 Usuário autenticado: ${decoded.username} (${decoded.role}) | Empresa: ${decoded.companyId}`);
    
    next();

  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Token inválido",
        code: "INVALID_TOKEN"
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Token expirado",
        code: "TOKEN_EXPIRED"
      });
    }

    return res.status(500).json({
      error: "Erro interno de autenticação",
    });
  }
}

/**
 * Middleware para verificar roles específicas
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userInfo = (req as any).user;
    
    if (!userInfo) {
      return res.status(401).json({
        error: "Usuário não autenticado",
      });
    }

    if (!roles.includes(userInfo.role)) {
      return res.status(403).json({
        error: `Acesso negado: requer uma das seguintes funções: ${roles.join(', ')}`,
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }

    next();
  };
}

/**
 * Middleware para verificar se é administrador
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole(['admin'])(req, res, next);
}

/**
 * Middleware para verificar se é administrador ou gerente
 */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  return requireRole(['admin', 'manager'])(req, res, next);
}
