
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/services/api';

// Tipos para o estado de autenticação
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  initializeAuth: () => void;
  clearError: () => void;
}

// Store do Zustand para gerenciar estado de autenticação
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // 🔹 LOGIN
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiRequest('POST', '/auth/login', {
            email,
            password,
          });

          const data = await response.json();

          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro ao fazer login';
          set({
            isLoading: false,
            error: errorMessage,
            user: null,
            accessToken: null,
            refreshToken: null,
          });

          return false;
        }
      },

      // 🔹 LOGOUT
      logout: () => {
        const { accessToken } = get();
        if (accessToken) {
          apiRequest('POST', '/auth/logout').catch(() => {
            // Ignorar erros no logout
          });
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      // 🔹 REFRESH TOKEN (ajustado para usar apiRequest)
      refreshAuth: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          return false;
        }

        try {
          const response = await apiRequest('POST', '/auth/refresh', {
            refreshToken,
          });

          if (!response.ok) {
            throw new Error('Token inválido');
          }

          const data = await response.json();

          set({
            accessToken: data.accessToken,
            error: null,
          });

          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      // 🔹 INICIALIZAÇÃO
      initializeAuth: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          get().refreshAuth();
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'godoy-sys-auth',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

