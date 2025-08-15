import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Interface para o usuário autenticado
interface AuthenticatedUser {
  userId: string;
  companyId: string;
  role: string;
}

// Extender o tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
    }
  }
}

// Middleware de autenticação JWT
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Token de acesso necessário" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido ou expirado" });
    }

    req.user = decoded as AuthenticatedUser;
    next();
  });
};

// Middleware para verificar roles/permissões
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Permissão insuficiente" });
    }

    next();
  };
};

// Middleware para verificar se o usuário pertence à mesma empresa
export const requireSameCompany = (req: Request, res: Response, next: NextFunction) => {
  const { companyId } = req.params;
  
  if (companyId && req.user.companyId !== companyId) {
    return res.status(403).json({ message: "Acesso negado a dados de outra empresa" });
  }

  next();
};
