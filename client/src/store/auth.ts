
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
      // Estado inicial
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      // Ações
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // 🔹 corrigido: sem /api no caminho
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
          const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
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

      logout: () => {
        const { accessToken } = get();
        if (accessToken) {
          // 🔹 corrigido: sem /api no caminho
          apiRequest('POST', '/auth/logout').catch(() => {
            // Ignorar erros no logout - limpar estado local mesmo assim
          });
        }
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          return false;
        }
        
        try {
          // 🔹 corrigido: sem /api no caminho
          const response = await fetch('/.netlify/functions/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
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
