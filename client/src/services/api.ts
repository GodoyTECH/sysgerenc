import { useAuthStore } from '@/store/auth';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions/api';

// Função para fazer requisições HTTP com autenticação
export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<Response> {
  const { accessToken, refreshAuth, logout } = useAuthStore.getState();

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Adicionar token de autorização se disponível
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };

  // Adicionar body se houver dados
  if (data !== undefined) {
    config.body = JSON.stringify(data);
  }

  try {
    let response = await fetch(url, config);

    // Tentar renovar token se recebeu 401/403
    if ((response.status === 401 || response.status === 403) && accessToken) {
      console.log('Token expirado, tentando renovar...');

      const refreshSuccess = await refreshAuth();
      if (refreshSuccess) {
        // Tentar a requisição novamente com o novo token
        const newToken = useAuthStore.getState().accessToken;
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
        } else {
          delete headers['Authorization'];
        }
        response = await fetch(url, { ...config, headers });
      } else {
        // Refresh falhou, fazer logout
        logout();
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    }

    // Verificar se a resposta é bem-sucedida
    if (!response.ok) {
      // tentar extrair mensagem da API
      let errMsg = `Erro ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) errMsg = errorData.message;
      } catch {}
      throw new Error(errMsg);
    }

    return response;
  } catch (error: any) {
    if (error instanceof TypeError && String(error.message).includes('fetch')) {
      throw new Error('Erro de conexão. Verifique sua internet.');
    }
    throw error;
  }
}

// Função utilitária para download de arquivos
export async function downloadFile(endpoint: string, filename?: string): Promise<void> {
  const response = await apiRequest('GET', endpoint);
  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Função utilitária para upload de arquivos
export async function uploadFile(
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
): Promise<Response> {
  const { accessToken, refreshAuth, logout } = useAuthStore.getState();

  const url = `${API_BASE_URL}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);

  // Adicionar dados adicionais
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config: RequestInit = {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  };

  let response = await fetch(url, config);

  if ((response.status === 401 || response.status === 403) && accessToken) {
    const refreshSuccess = await refreshAuth();
    if (refreshSuccess) {
      const newToken = useAuthStore.getState().accessToken;
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      } else {
        delete headers['Authorization'];
      }
      response = await fetch(url, { ...config, headers });
    } else {
      logout();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  }

  if (!response.ok) {
    let errMsg = `Erro ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errMsg = errorData.message;
    } catch {}
    throw new Error(errMsg);
  }

  return response;
}

// Facade
export const api = {
  get: (endpoint: string) => apiRequest('GET', endpoint),
  post: (endpoint: string, data?: unknown) => apiRequest('POST', endpoint, data),
  put: (endpoint: string, data?: unknown) => apiRequest('PUT', endpoint, data),
  patch: (endpoint: string, data?: unknown) => apiRequest('PATCH', endpoint, data),
  delete: (endpoint: string) => apiRequest('DELETE', endpoint),

  download: downloadFile,
  upload: uploadFile,
};
