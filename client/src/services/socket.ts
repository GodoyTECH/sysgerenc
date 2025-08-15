/**
 * GodoySys - Serviço de WebSocket
 * 
 * Este módulo gerencia conexões WebSocket para funcionalidades
 * em tempo real como chat e atualizações de pedidos.
 */

import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { useOrderStore } from '@/store/useOrderStore';
import { toast } from '@/hooks/use-toast';

// Interface para mensagens WebSocket
interface WSMessage {
  type: string;
  data: any;
  timestamp?: string;
}

// Estado da conexão WebSocket
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;

/**
 * Obtém URL do WebSocket baseada no ambiente
 */
function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

/**
 * Conecta ao WebSocket
 */
export function connectSocket(): Promise<boolean> {
  return new Promise((resolve) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket já conectado');
      resolve(true);
      return;
    }

    if (isConnecting) {
      console.log('🔌 WebSocket já está conectando...');
      resolve(false);
      return;
    }

    isConnecting = true;
    const wsUrl = getWebSocketUrl();
    const { tokens } = useAuthStore.getState();

    if (!tokens?.accessToken) {
      console.warn('⚠️ Token não encontrado para WebSocket');
      isConnecting = false;
      resolve(false);
      return;
    }

    try {
      console.log('🔌 Conectando WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('🔌 WebSocket conectado');
        isConnecting = false;
        reconnectAttempts = 0;

        // Autenticar com token
        sendMessage({
          type: 'auth',
          data: { token: tokens.accessToken },
        });

        // Atualizar estado do chat
        useChatStore.getState().setConnectionStatus(true);
        
        resolve(true);
      };

      socket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Erro ao processar mensagem WebSocket:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket desconectado:', event.code, event.reason);
        isConnecting = false;
        socket = null;
        
        // Atualizar estado do chat
        useChatStore.getState().setConnectionStatus(false);

        // Tentar reconectar se não foi fechado intencionalmente
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          toast({
            title: 'Conexão Perdida',
            description: 'Não foi possível reconectar. Recarregue a página.',
            variant: 'destructive',
          });
        }

        resolve(false);
      };

      socket.onerror = (error) => {
        console.error('❌ Erro WebSocket:', error);
        isConnecting = false;
        resolve(false);
      };

    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      isConnecting = false;
      resolve(false);
    }
  });
}

/**
 * Desconecta do WebSocket
 */
export function disconnectSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (socket) {
    console.log('🔌 Desconectando WebSocket...');
    socket.close(1000, 'Logout');
    socket = null;
  }

  useChatStore.getState().setConnectionStatus(false);
}

/**
 * Envia mensagem pelo WebSocket
 */
export function sendMessage(message: WSMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket não conectado, não foi possível enviar mensagem');
    return false;
  }

  try {
    socket.send(JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WebSocket:', error);
    return false;
  }
}

/**
 * Entra em um canal de chat
 */
export function joinChannel(channel: string): boolean {
  return sendMessage({
    type: 'join_channel',
    data: { channel },
  });
}

/**
 * Sai de um canal de chat
 */
export function leaveChannel(channel: string): boolean {
  return sendMessage({
    type: 'leave_channel',
    data: { channel },
  });
}

/**
 * Agenda tentativa de reconexão
 */
function scheduleReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
  reconnectAttempts++;

  console.log(`🔄 Tentativa de reconexão ${reconnectAttempts}/${maxReconnectAttempts} em ${delay}ms`);

  reconnectTimeout = setTimeout(() => {
    connectSocket();
  }, delay);
}

/**
 * Processa mensagens recebidas do WebSocket
 */
function handleMessage(message: WSMessage) {
  console.log('📨 WebSocket mensagem recebida:', message.type);

  switch (message.type) {
    case 'auth_success':
      console.log('✅ WebSocket autenticado:', message.data.username);
      
      // Entrar nos canais padrão
      joinChannel('general');
      joinChannel('support');
      
      // Se usuário tem acesso à cozinha, entrar no canal
      const { user } = useAuthStore.getState();
      if (user && ['admin', 'manager', 'kitchen'].includes(user.role)) {
        joinChannel('kitchen');
      }
      break;

    case 'channel_joined':
      console.log(`📺 Entrou no canal: #${message.data.channel}`);
      break;

    case 'channel_left':
      console.log(`📺 Saiu do canal: #${message.data.channel}`);
      break;

    case 'chat_message':
      // Nova mensagem de chat
      const { channel, message: chatMessage } = message.data;
      useChatStore.getState().addMessage(chatMessage);
      
      // Mostrar notificação se não está no canal ativo
      const { activeChannel } = useChatStore.getState();
      if (channel !== activeChannel) {
        toast({
          title: `#${channel}`,
          description: `${chatMessage.user?.name}: ${chatMessage.message}`,
          duration: 3000,
        });
      }
      break;

    case 'order_update':
      // Atualização de pedido
      const orderData = message.data;
      console.log('🧾 Atualização de pedido recebida:', orderData.id);
      
      // Atualizar store de pedidos
      useOrderStore.getState().fetchOrders();
      
      // Mostrar notificação para mudanças de status importantes
      if (['ready', 'delivered'].includes(orderData.status)) {
        toast({
          title: 'Pedido Atualizado',
          description: `Pedido ${orderData.id.slice(0, 8)} está ${orderData.status === 'ready' ? 'pronto' : 'entregue'}`,
        });
      }
      break;

    case 'user_online':
      // Usuário ficou online
      const onlineUser = message.data;
      console.log('👤 Usuário online:', onlineUser.name);
      break;

    case 'user_offline':
      // Usuário ficou offline
      const offlineUser = message.data;
      console.log('👤 Usuário offline:', offlineUser.name);
      break;

    case 'ping':
      // Responder com pong
      sendMessage({ type: 'pong', data: {} });
      break;

    case 'pong':
      // Pong recebido, conexão ativa
      break;

    case 'error':
      console.error('❌ Erro WebSocket:', message.data.message);
      toast({
        title: 'Erro de Conexão',
        description: message.data.message,
        variant: 'destructive',
      });
      break;

    default:
      console.log('⚠️ Tipo de mensagem WebSocket desconhecido:', message.type);
  }
}

/**
 * Verifica se WebSocket está conectado
 */
export function isSocketConnected(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

/**
 * Obtém estado da conexão WebSocket
 */
export function getSocketState(): string {
  if (!socket) return 'disconnected';
  
  switch (socket.readyState) {
    case WebSocket.CONNECTING: return 'connecting';
    case WebSocket.OPEN: return 'connected';
    case WebSocket.CLOSING: return 'closing';
    case WebSocket.CLOSED: return 'disconnected';
    default: return 'unknown';
  }
}

/**
 * Inicializa conexão WebSocket (chamada após login)
 */
export async function initializeSocket(): Promise<boolean> {
  const { isAuthenticated } = useAuthStore.getState();
  
  if (!isAuthenticated) {
    console.log('🔌 Usuário não autenticado, não conectando WebSocket');
    return false;
  }

  console.log('🚀 Inicializando WebSocket...');
  return await connectSocket();
}

/**
 * Mantém conexão ativa com ping periódico
 */
export function startHeartbeat() {
  const heartbeatInterval = setInterval(() => {
    if (isSocketConnected()) {
      sendMessage({ type: 'ping', data: {} });
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Ping a cada 30 segundos

  return heartbeatInterval;
}

// Iniciar heartbeat automaticamente
if (typeof window !== 'undefined') {
  startHeartbeat();
}
