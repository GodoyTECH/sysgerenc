/**
 * GodoySys - Store da Empresa
 * 
 * Este store gerencia informações e configurações da empresa
 * no contexto multi-tenant usando Zustand.
 */

import { create } from 'zustand';
import { api } from '@/services/api';

// Tipos para configurações da empresa
interface CompanySettings {
  currency: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  features: string[];
}

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

interface CompanyStats {
  todaySales: number;
  pendingOrders: number;
  avgTicket: number;
  lowStockCount: number;
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
}

interface CompanyState {
  // Estado
  company: Company | null;
  stats: CompanyStats | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  
  // Ações
  fetchCompany: () => Promise<void>;
  updateCompany: (updates: Partial<Company>) => Promise<boolean>;
  updateSettings: (settings: Partial<CompanySettings>) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  refreshData: () => Promise<void>;
}

/**
 * Store da empresa usando Zustand
 */
export const useCompanyStore = create<CompanyState>((set, get) => ({
  // Estado inicial
  company: null,
  stats: null,
  isLoading: false,
  lastUpdated: null,

  /**
   * Busca dados da empresa atual
   */
  fetchCompany: async () => {
    set({ isLoading: true });
    
    try {
      console.log('🏢 Buscando dados da empresa...');
      
      const response = await api.get('/company');
      const { company } = response.data;

      set({
        company,
        isLoading: false,
        lastUpdated: new Date(),
      });

      console.log('✅ Dados da empresa carregados:', company.name);

    } catch (error) {
      console.error('❌ Erro ao buscar dados da empresa:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Atualiza dados gerais da empresa
   */
  updateCompany: async (updates: Partial<Company>) => {
    try {
      console.log('🏢 Atualizando empresa...', updates);
      
      const response = await api.put('/company', updates);
      const { company } = response.data;

      set({
        company,
        lastUpdated: new Date(),
      });

      console.log('✅ Empresa atualizada com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar empresa:', error);
      return false;
    }
  },

  /**
   * Atualiza configurações específicas da empresa
   */
  updateSettings: async (settings: Partial<CompanySettings>) => {
    try {
      console.log('⚙️ Atualizando configurações...', settings);
      
      const response = await api.put('/company/settings', settings);
      const { settings: newSettings } = response.data;

      // Atualizar settings na empresa atual
      const { company } = get();
      if (company) {
        set({
          company: {
            ...company,
            settings: newSettings,
          },
          lastUpdated: new Date(),
        });
      }

      console.log('✅ Configurações atualizadas com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error);
      return false;
    }
  },

  /**
   * Busca estatísticas da empresa
   */
  fetchStats: async () => {
    try {
      console.log('📊 Buscando estatísticas da empresa...');
      
      const response = await api.get('/company/stats');
      const { metrics } = response.data;

      set({
        stats: metrics,
        lastUpdated: new Date(),
      });

      console.log('✅ Estatísticas carregadas');

    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
    }
  },

  /**
   * Atualiza todos os dados da empresa
   */
  refreshData: async () => {
    await Promise.all([
      get().fetchCompany(),
      get().fetchStats(),
    ]);
  },
}));

/**
 * Hook para verificar funcionalidades habilitadas
 */
export function useCompanyFeatures() {
  const { company } = useCompanyStore();
  const features = company?.settings?.features || [];

  return {
    hasPDV: features.includes('pdv'),
    hasKitchen: features.includes('kitchen'),
    hasChat: features.includes('chat'),
    hasReports: features.includes('reports'),
    hasMultiUser: features.includes('multi_user'),
    hasInventory: features.includes('inventory'),
    hasDelivery: features.includes('delivery'),
    hasPayments: features.includes('payments'),
    isFeatureEnabled: (feature: string) => features.includes(feature),
  };
}

/**
 * Hook para informações de horário de funcionamento
 */
export function useWorkingHours() {
  const { company } = useCompanyStore();
  const workingHours = company?.settings?.workingHours;

  const isOpen = () => {
    if (!workingHours) return true; // Se não definido, assumir aberto
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    return currentTime >= workingHours.start && currentTime <= workingHours.end;
  };

  const getStatus = () => {
    if (!workingHours) return 'always_open';
    return isOpen() ? 'open' : 'closed';
  };

  const getNextChange = () => {
    if (!workingHours) return null;
    
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (isOpen()) {
      // Se aberto, retornar horário de fechamento
      return workingHours.end;
    } else {
      // Se fechado, retornar horário de abertura
      return workingHours.start;
    }
  };

  return {
    workingHours,
    isOpen: isOpen(),
    status: getStatus(),
    nextChange: getNextChange(),
    openTime: workingHours?.start,
    closeTime: workingHours?.end,
  };
}

/**
 * Hook para formatação de moeda da empresa
 */
export function useCurrency() {
  const { company } = useCompanyStore();
  const currency = company?.settings?.currency || 'BRL';

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return 'R$ 0,00';

    switch (currency) {
      case 'BRL':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numValue);
      
      case 'USD':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(numValue);
      
      default:
        return `${currency} ${numValue.toFixed(2)}`;
    }
  };

  const formatNumber = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return '0';

    return new Intl.NumberFormat('pt-BR').format(numValue);
  };

  return {
    currency,
    formatCurrency,
    formatNumber,
    symbol: currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency,
  };
}
