/**
 * GodoySys - Store de Autenticação
 *
 * Gerencia autenticação, tokens JWT e informações de sessão com Zustand.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

// Tipos de usuário e empresa
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
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  company: Company | null;
  tokens: AuthTokens | null;

  login: (username: string, password: string, companyId?: string) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      company: null,
      tokens: null,

      /**
       * Realiza login
       */
      login: async (username, password, companyId) => {
        try {
          console.log('🔐 Login:', { username, companyId });

          const response = await api.post('/auth/login', {
            username,
            password,
            companyId,
          });

          const data = await response.json();
          const { user, tokens } = data;

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            tokens,
          });

          // Buscar empresa
          try {
            const companyResponse = await api.get('/company');
            const companyData = await companyResponse.json();
            set({ company: companyData.company });
          } catch (err) {
            console.warn('⚠️ Erro ao buscar empresa:', err);
          }

          console.log('✅ Login OK');
          return true;
        } catch (err) {
          console.error('❌ Falha no login:', err);
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
       * Logout
       */
      logout: () => {
        const { tokens } = get();

        (async () => {
          try {
            if (tokens?.accessToken) {
              await api.post('/auth/logout');
            }
          } catch (err) {
            console.warn('⚠️ Erro ao notificar logout:', err);
          }
        })();

        set({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          company: null,
          tokens: null,
        });

        console.log('👋 Logout OK');
      },

      /**
       * Renova token
       */
      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) return false;

        try {
          console.log('🔄 Renovando token...');
          const response = await api.post('/auth/refresh', {
            refreshToken: tokens.refreshToken,
          });

          const data = await response.json();
          if (!data?.tokens) throw new Error('Sem tokens no refresh');

          set({ tokens: data.tokens });
          console.log('✅ Token renovado');
          return true;
        } catch (err) {
          console.error('❌ Refresh falhou:', err);
          get().logout();
          return false;
        }
      },

      /**
       * Verifica autenticação
       */
      checkAuth: async () => {
        const { tokens } = get();

        if (!tokens?.accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          console.log('🔍 Verificando auth...');
          const response = await api.get('/auth/me');
          const data = await response.json();
          const { user, company } = data;

          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            company,
          });

          console.log(`✅ Autenticado: ${user?.name || 'Usuário'}`);
        } catch (err) {
          console.warn('❌ Token inválido, tentando refresh...');
          const renewed = await get().refreshToken();

          if (!renewed) {
            set({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              company: null,
              tokens: null,
            });
          } else {
            set({ isLoading: false });
          }
        }
      },

      /**
       * Atualiza perfil
       */
      updateProfile: (userData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },
    }),
    {
      name: 'godoy-auth',
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Hook de permissões
 */
export function usePermissions() {
  const { user } = useAuthStore();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isAttendant: user?.role === 'attendant',
    isKitchen: user?.role === 'kitchen',
    hasRole: (roles: string[]) => (user ? roles.includes(user.role) : false),
    canManageUsers: ['admin', 'manager'].includes(user?.role || ''),
    canManageProducts: ['admin', 'manager'].includes(user?.role || ''),
    canViewReports: ['admin', 'manager'].includes(user?.role || ''),
    canManageOrders: true,
    canAccessKitchen: ['admin', 'manager', 'kitchen'].includes(user?.role || ''),
  };
}

/**
 * Hook do usuário autenticado
 */
export function useUser() {
  const { user, company, isAuthenticated, isLoading } = useAuthStore();

  return {
    user,
    company,
    isAuthenticated,
    isLoading,
    isAdmin: user?.role === 'admin',
    userInitials:
      user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase() || 'U',
  };
}
