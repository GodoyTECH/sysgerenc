/**
 * GodoySys - Serviço de API
 * 
 * Este módulo gerencia todas as requisições HTTP para a API,
 * incluindo interceptadores para autenticação e tratamento de erros.
 */

import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/hooks/use-toast';

// Configuração da base URL da API
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Interface para resposta da API
interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
}

// Classe para erros da API
class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Função auxiliar para fazer requisições HTTP
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const { tokens } = useAuthStore.getState();

  // Configurar headers padrão
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Adicionar token de autorização se disponível
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  // Configurar opções da requisição
  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    console.log(`🌐 API ${options.method || 'GET'}: ${endpoint}`);
    
    const response = await fetch(url, requestOptions);
    
    // Tentar parsing do JSON
    let responseData: any;
    const contentType = response.headers.get('Content-Type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { data: await response.text() };
    }

    // Verificar se a resposta foi bem-sucedida
    if (!response.ok) {
      const error = new ApiError(
        responseData.error || response.statusText,
        response.status,
        responseData.code,
        responseData.details
      );

      // Tratar erros específicos
      if (response.status === 401) {
        // Token expirado - tentar renovar
        const refreshed = await handleTokenRefresh();
        
        if (refreshed) {
          // Tentar novamente com novo token
          return makeRequest(endpoint, options);
        } else {
          // Fazer logout se não conseguiu renovar
          useAuthStore.getState().logout();
          throw new ApiError('Sessão expirada', 401, 'SESSION_EXPIRED');
        }
      }

      if (response.status === 403) {
        toast({
          title: 'Acesso Negado',
          description: responseData.error || 'Você não tem permissão para esta ação',
          variant: 'destructive',
        });
      }

      if (response.status >= 500) {
        toast({
          title: 'Erro do Servidor',
          description: 'Ocorreu um erro interno. Tente novamente.',
          variant: 'destructive',
        });
      }

      throw error;
    }

    console.log(`✅ API ${options.method || 'GET'}: ${endpoint} - ${response.status}`);
    return responseData;

  } catch (error) {
    console.error(`❌ API ${options.method || 'GET'}: ${endpoint}`, error);
    
    // Se é um erro de rede
    if (error instanceof TypeError) {
      toast({
        title: 'Erro de Conexão',
        description: 'Verifique sua conexão com a internet',
        variant: 'destructive',
      });
      throw new ApiError('Erro de conexão', 0, 'NETWORK_ERROR');
    }

    // Re-throw se já é um ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Erro desconhecido
    throw new ApiError('Erro desconhecido', 500, 'UNKNOWN_ERROR');
  }
}

/**
 * Tenta renovar o token de acesso
 */
async function handleTokenRefresh(): Promise<boolean> {
  const { tokens, refreshToken } = useAuthStore.getState();
  
  if (!tokens?.refreshToken) {
    return false;
  }

  try {
    console.log('🔄 Tentando renovar token...');
    
    const success = await refreshToken();
    
    if (success) {
      console.log('✅ Token renovado com sucesso');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Falha ao renovar token:', error);
    return false;
  }
}

/**
 * Objeto API com métodos HTTP
 */
export const api = {
  /**
   * Requisição GET
   */
  get: <T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> => {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return makeRequest<T>(url, { method: 'GET' });
  },

  /**
   * Requisição POST
   */
  post: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Requisição PUT
   */
  put: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Requisição PATCH
   */
  patch: <T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> => {
    return makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Requisição DELETE
   */
  delete: <T = any>(endpoint: string): Promise<ApiResponse<T>> => {
    return makeRequest<T>(endpoint, { method: 'DELETE' });
  },

  /**
   * Upload de arquivo
   */
  upload: <T = any>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const { tokens } = useAuthStore.getState();
    const headers: HeadersInit = {};
    
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data.error || 'Erro no upload', response.status);
      }
      
      return data;
    });
  },

  /**
   * Download de arquivo
   */
  download: async (endpoint: string, filename?: string): Promise<void> => {
    const { tokens } = useAuthStore.getState();
    const headers: HeadersInit = {};
    
    if (tokens?.accessToken) {
      headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(errorData.error || 'Erro no download', response.status);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Erro no download:', error);
      toast({
        title: 'Erro no Download',
        description: 'Não foi possível baixar o arquivo',
        variant: 'destructive',
      });
    }
  },
};

// Export do tipo de erro para uso nos componentes
export { ApiError };

// Helpers para tratamento de erros específicos
export const handleApiError = (error: unknown, fallbackMessage = 'Ocorreu um erro') => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return fallbackMessage;
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
