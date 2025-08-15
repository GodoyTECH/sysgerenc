/**
 * GodoySys - Store de Chat
 * 
 * Este store gerencia o estado do chat interno, mensagens,
 * canais e funcionalidades em tempo real usando Zustand.
 */

import { create } from 'zustand';
import { api } from '@/services/api';

// Tipos para o chat
interface ChatUser {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'attendant' | 'kitchen';
}

interface ChatMessage {
  id: string;
  userId: string;
  channel: 'general' | 'support' | 'kitchen';
  message: string;
  metadata: any;
  createdAt: string;
  user?: ChatUser;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  roles?: string[];
  messageCount: number;
  lastActivity: string | null;
  unreadCount: number;
}

interface OnlineUser {
  id: string;
  name: string;
  role: string;
  lastSeen: string;
}

interface ChatState {
  // Estado das mensagens
  messages: { [channel: string]: ChatMessage[] };
  channels: ChatChannel[];
  activeChannel: string;
  onlineUsers: OnlineUser[];
  isLoading: boolean;
  isConnected: boolean;
  
  // Estado da interface
  newMessage: string;
  isTyping: boolean;
  typingUsers: { [channel: string]: string[] };
  
  // Ações
  fetchChannels: () => Promise<void>;
  fetchMessages: (channel: string) => Promise<void>;
  sendMessage: (channel: string, message: string) => Promise<boolean>;
  setActiveChannel: (channel: string) => void;
  setNewMessage: (message: string) => void;
  
  // WebSocket events
  addMessage: (message: ChatMessage) => void;
  setConnectionStatus: (connected: boolean) => void;
  updateOnlineUsers: (users: OnlineUser[]) => void;
  setTyping: (channel: string, users: string[]) => void;
  
  // Utilitários
  getChannelMessages: (channel: string) => ChatMessage[];
  getUnreadCount: (channel: string) => number;
  markChannelAsRead: (channel: string) => void;
}

/**
 * Store de chat usando Zustand
 */
export const useChatStore = create<ChatState>((set, get) => ({
  // Estado inicial
  messages: {},
  channels: [],
  activeChannel: 'general',
  onlineUsers: [],
  isLoading: false,
  isConnected: false,
  
  // Interface
  newMessage: '',
  isTyping: false,
  typingUsers: {},

  /**
   * Busca canais disponíveis
   */
  fetchChannels: async () => {
    try {
      console.log('💬 Buscando canais de chat...');
      
      const response = await api.get('/chat/channels');
      const { channels } = response.data;

      set({ channels });

      console.log(`✅ ${channels.length} canais carregados`);

    } catch (error) {
      console.error('❌ Erro ao buscar canais:', error);
    }
  },

  /**
   * Busca mensagens de um canal
   */
  fetchMessages: async (channel: string) => {
    set({ isLoading: true });
    
    try {
      console.log(`💬 Buscando mensagens do canal #${channel}...`);
      
      const response = await api.get(`/chat/messages?channel=${channel}&limit=50`);
      const { messages } = response.data;

      set(state => ({
        messages: {
          ...state.messages,
          [channel]: messages.reverse(), // API retorna mais recentes primeiro
        },
        isLoading: false,
      }));

      console.log(`✅ ${messages.length} mensagens carregadas para #${channel}`);

    } catch (error) {
      console.error('❌ Erro ao buscar mensagens:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Envia uma nova mensagem
   */
  sendMessage: async (channel: string, message: string) => {
    if (!message.trim()) return false;
    
    try {
      console.log(`💬 Enviando mensagem para #${channel}:`, message);
      
      const response = await api.post('/chat/messages', {
        channel,
        message: message.trim(),
      });

      const { chatMessage } = response.data;

      // Adicionar mensagem localmente (também virá via WebSocket)
      get().addMessage(chatMessage);

      console.log('✅ Mensagem enviada');
      return true;

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  },

  /**
   * Define canal ativo
   */
  setActiveChannel: (channel: string) => {
    set({ activeChannel: channel });
    
    // Marcar canal como lido
    get().markChannelAsRead(channel);
    
    // Buscar mensagens se não existirem
    const { messages } = get();
    if (!messages[channel]) {
      get().fetchMessages(channel);
    }
  },

  /**
   * Define texto da nova mensagem
   */
  setNewMessage: (message: string) => {
    set({ newMessage: message });
  },

  /**
   * Adiciona nova mensagem (vinda do WebSocket)
   */
  addMessage: (message: ChatMessage) => {
    set(state => {
      const channelMessages = state.messages[message.channel] || [];
      
      // Verificar se mensagem já existe
      const exists = channelMessages.some(m => m.id === message.id);
      if (exists) return state;

      return {
        messages: {
          ...state.messages,
          [message.channel]: [...channelMessages, message],
        },
      };
    });
  },

  /**
   * Define status de conexão WebSocket
   */
  setConnectionStatus: (connected: boolean) => {
    set({ isConnected: connected });
    console.log(`🔌 Chat ${connected ? 'conectado' : 'desconectado'}`);
  },

  /**
   * Atualiza lista de usuários online
   */
  updateOnlineUsers: (users: OnlineUser[]) => {
    set({ onlineUsers: users });
  },

  /**
   * Define usuários digitando
   */
  setTyping: (channel: string, users: string[]) => {
    set(state => ({
      typingUsers: {
        ...state.typingUsers,
        [channel]: users,
      },
    }));
  },

  /**
   * Obtém mensagens de um canal
   */
  getChannelMessages: (channel: string) => {
    const { messages } = get();
    return messages[channel] || [];
  },

  /**
   * Obtém contagem de mensagens não lidas
   */
  getUnreadCount: (channel: string) => {
    const { channels } = get();
    const channelData = channels.find(c => c.id === channel);
    return channelData?.unreadCount || 0;
  },

  /**
   * Marca canal como lido
   */
  markChannelAsRead: (channel: string) => {
    set(state => ({
      channels: state.channels.map(c =>
        c.id === channel ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },
}));

/**
 * Hook para canal ativo
 */
export function useActiveChannel() {
  const { 
    activeChannel, 
    getChannelMessages, 
    newMessage, 
    setNewMessage,
    sendMessage,
    isLoading 
  } = useChatStore();

  const messages = getChannelMessages(activeChannel);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const success = await sendMessage(activeChannel, newMessage);
      if (success) {
        setNewMessage('');
      }
      return success;
    }
    return false;
  };

  return {
    activeChannel,
    messages,
    newMessage,
    setNewMessage,
    sendMessage: handleSendMessage,
    isLoading,
    displayName: {
      general: '#geral',
      support: '#suporte',
      kitchen: '#cozinha',
    }[activeChannel] || `#${activeChannel}`,
  };
}

/**
 * Hook para notificações de chat
 */
export function useChatNotifications() {
  const { channels, activeChannel } = useChatStore();

  const totalUnread = channels.reduce((sum, channel) => sum + channel.unreadCount, 0);
  const hasUnread = totalUnread > 0;
  
  const channelNotifications = channels.map(channel => ({
    channel: channel.id,
    name: channel.name,
    unreadCount: channel.unreadCount,
    isActive: channel.id === activeChannel,
  }));

  return {
    totalUnread,
    hasUnread,
    channelNotifications,
  };
}

/**
 * Hook para usuários online
 */
export function useOnlineUsers() {
  const { onlineUsers, isConnected } = useChatStore();

  const usersByRole = {
    admin: onlineUsers.filter(u => u.role === 'admin'),
    manager: onlineUsers.filter(u => u.role === 'manager'),
    attendant: onlineUsers.filter(u => u.role === 'attendant'),
    kitchen: onlineUsers.filter(u => u.role === 'kitchen'),
  };

  return {
    onlineUsers,
    totalOnline: onlineUsers.length,
    isConnected,
    usersByRole,
  };
}
