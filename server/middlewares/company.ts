/**
 * GodoySys - Middleware de Validação de Empresa
 * 
 * Este middleware valida se a empresa do usuário autenticado
 * existe e está ativa no sistema multi-tenant.
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware para validar empresa (multi-tenant)
 * Verifica se a empresa do usuário autenticado existe e está ativa
 */
export async function validateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const userInfo = (req as any).user;
    
    // Se não há informações do usuário, pular validação
    // (será tratado pelo middleware de auth)
    if (!userInfo || !userInfo.companyId) {
      return next();
    }

    // Buscar dados da empresa
    const company = await storage.getCompany(userInfo.companyId);
    
    if (!company) {
      console.error(`❌ Empresa não encontrada: ${userInfo.companyId}`);
      return res.status(404).json({
        error: "Empresa não encontrada",
        code: "COMPANY_NOT_FOUND"
      });
    }

    // Adicionar informações da empresa na requisição
    (req as any).company = {
      id: company.id,
      name: company.name,
      email: company.email,
      settings: company.settings || {},
    };

    console.log(`🏢 Empresa validada: ${company.name} (${company.id})`);
    
    next();

  } catch (error) {
    console.error("❌ Erro na validação da empresa:", error);
    
    return res.status(500).json({
      error: "Erro interno na validação da empresa",
    });
  }
}

/**
 * Middleware para verificar configurações específicas da empresa
 */
export function requireCompanyFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const companyInfo = (req as any).company;
    
    if (!companyInfo) {
      return res.status(400).json({
        error: "Informações da empresa não encontradas",
        code: "COMPANY_INFO_MISSING"
      });
    }

    const features = companyInfo.settings?.features || [];
    
    if (!features.includes(feature)) {
      return res.status(403).json({
        error: `Funcionalidade '${feature}' não habilitada para esta empresa`,
        code: "FEATURE_NOT_ENABLED"
      });
    }

    next();
  };
}

/**
 * Middleware para verificar horário de funcionamento
 */
export function checkWorkingHours(req: Request, res: Response, next: NextFunction) {
  const companyInfo = (req as any).company;
  
  if (!companyInfo) {
    return next(); // Pular se não há info da empresa
  }

  const workingHours = companyInfo.settings?.workingHours;
  if (!workingHours) {
    return next(); // Pular se não há horário definido
  }

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const { start, end } = workingHours;
  
  // Verificação simples de horário (não considera dias da semana)
  if (currentTime < start || currentTime > end) {
    return res.status(423).json({
      error: "Fora do horário de funcionamento",
      workingHours: { start, end },
      currentTime,
      code: "OUTSIDE_WORKING_HOURS"
    });
  }

  next();
}
