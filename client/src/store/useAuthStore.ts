/**
 * GodoySys - Store de Autenticação
 * 
 * Este store gerencia o estado de autenticação do usuário,
 * tokens JWT e informações da sessão usando Zustand.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

// Tipos para o estado de autenticação
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'manager' | 'attendant' | 'kitchen';
  companyId: string;
  lastLogin?: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  email: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  // Estado
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  company: Company | null;
  tokens: AuthTokens | null;
  
  // Ações
  login: (username: string, password: string, companyId?: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => void;
}

/**
 * Store de autenticação usando Zustand com persistência
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isAuthenticated: false,
      isLoading: true,
      user: null,
      company: null,
      tokens: null,

      /**
       * Realiza login do usuário
       */
      login: async (username: string, password: string, companyId?: string) => {
        try {
          console.log('🔐 Tentando fazer login...', { username, companyId });
          
          const response = await api.post('/auth/login', {
            username,
            password,
            companyId,
          });

          const { user, tokens } = response.data;

          // Atualizar estado
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            tokens,
          });

          // Buscar dados da empresa após login
          try {
            const companyResponse = await api.get('/company');
            set({ company: companyResponse.data.company });
          } catch (error) {
            console.warn('⚠️ Erro ao buscar dados da empresa:', error);
          }

          console.log('✅ Login realizado com sucesso');
          return true;

        } catch (error: any) {
          console.error('❌ Erro no login:', error);
          set({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            company: null,
            tokens: null,
          });
          return false;
        }
      },

      /**
       * Realiza logout do usuário
       */
      logout: async () => {
        const { tokens } = get();
        
        try {
          // Tentar notificar o servidor sobre o logout
          if (tokens?.accessToken) {
            await api.post('/auth/logout');
          }
        } catch (error) {
          console.warn('⚠️ Erro ao notificar logout no servidor:', error);
        }

        // Limpar estado local
        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          company: null,
          tokens: null,
        });

        console.log('👋 Logout realizado');
      },

      /**
       * Renova o token de acesso
       */
      refreshToken: async () => {
        const { tokens } = get();
        
        if (!tokens?.refreshToken) {
          return false;
        }

        try {
          console.log('🔄 Renovando token...');
          
          const response = await api.post('/auth/refresh', {
            refreshToken: tokens.refreshToken,
          });

          const { tokens: newTokens } = response.data;

          set({
            tokens: newTokens,
          });

          console.log('✅ Token renovado com sucesso');
          return true;

        } catch (error) {
          console.error('❌ Erro ao renovar token:', error);
          
          // Se falhou ao renovar, fazer logout
          get().logout();
          return false;
        }
      },

      /**
       * Verifica se o usuário está autenticado
       */
      checkAuth: async () => {
        const { tokens } = get();
        
        if (!tokens?.accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          console.log('🔍 Verificando autenticação...');
          
          // Tentar buscar perfil do usuário
          const response = await api.get('/auth/me');
          const { user, company } = response.data;

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            company,
          });

          console.log('✅ Usuário autenticado:', user.name);

        } catch (error: any) {
          console.log('❌ Token inválido, tentando renovar...');
          
          // Tentar renovar token se falhou
          const renewed = await get().refreshToken();
          
          if (!renewed) {
            set({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              company: null,
              tokens: null,
            });
          }
        }
      },

      /**
       * Atualiza dados do perfil do usuário
       */
      updateProfile: (userData: Partial<User>) => {
        const { user } = get();
        
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },
    }),
    {
      name: 'godoy-auth', // Nome da chave no localStorage
      partialize: (state) => ({
        // Persistir apenas tokens e dados básicos
        tokens: state.tokens,
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook para verificar permissões do usuário
 */
export function usePermissions() {
  const { user } = useAuthStore();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isAttendant: user?.role === 'attendant',
    isKitchen: user?.role === 'kitchen',
    hasRole: (roles: string[]) => user ? roles.includes(user.role) : false,
    canManageUsers: user?.role === 'admin' || user?.role === 'manager',
    canManageProducts: user?.role === 'admin' || user?.role === 'manager',
    canViewReports: user?.role === 'admin' || user?.role === 'manager',
    canManageOrders: true, // Todos podem gerenciar pedidos
    canAccessKitchen: user?.role === 'admin' || user?.role === 'manager' || user?.role === 'kitchen',
  };
}

/**
 * Hook para obter informações do usuário autenticado
 */
export function useUser() {
  const { user, company, isAuthenticated, isLoading } = useAuthStore();

  return {
    user,
    company,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin',
    userInitials: user?.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U',
  };
}
