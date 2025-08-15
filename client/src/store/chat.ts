import { create } from 'zustand';
import { apiRequest } from '@/services/api';

// Tipos para mensagens do chat
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  channel: 'general' | 'support' | 'kitchen';
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatState {
  messages: Record<string, ChatMessage[]>; // messages por canal
  currentChannel: string;
  isLoading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>;
}

interface ChatActions {
  fetchMessages: (channel: string) => Promise<void>;
  sendMessage: (channel: string, message: string) => Promise<boolean>;
  setCurrentChannel: (channel: string) => void;
  markAsRead: (channel: string) => void;
  addMessageFromWebSocket: (message: ChatMessage) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // Estado inicial
  messages: {
    general: [],
    support: [],
    kitchen: [],
  },
  currentChannel: 'general',
  isLoading: false,
  error: null,
  unreadCounts: {
    general: 0,
    support: 0,
    kitchen: 0,
  },

  // Ações
  fetchMessages: async (channel) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiRequest('GET', `/api/chat/${channel}?limit=50`);
      const messages = await response.json();
      
      set(state => ({
        messages: {
          ...state.messages,
          [channel]: messages,
        },
        isLoading: false,
      }));
      
      // Marcar mensagens como lidas se for o canal atual
      if (channel === get().currentChannel) {
        get().markAsRead(channel);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar mensagens';
      set({ error: errorMessage, isLoading: false });
    }
  },

  sendMessage: async (channel, message) => {
    if (!message.trim()) {
      return false;
    }
    
    try {
      const response = await apiRequest('POST', `/api/chat/${channel}`, { message });
      const newMessage = await response.json();
      
      // A mensagem será adicionada via WebSocket, não precisamos adicionar aqui
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      set({ error: errorMessage });
      return false;
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
    
    // Marcar mensagens do novo canal como lidas
    get().markAsRead(channel);
    
    // Buscar mensagens se ainda não foram carregadas
    const { messages } = get();
    if (!messages[channel] || messages[channel].length === 0) {
      get().fetchMessages(channel);
    }
  },

  markAsRead: (channel) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channel]: 0,
      },
      messages: {
        ...state.messages,
        [channel]: state.messages[channel].map(msg => ({
          ...msg,
          isRead: true,
        })),
      },
    }));
  },

  addMessageFromWebSocket: (newMessage) => {
    const { currentChannel } = get();
    
    set(state => {
      const channelMessages = [...(state.messages[newMessage.channel] || []), newMessage];
      
      // Manter apenas as últimas 100 mensagens por canal
      if (channelMessages.length > 100) {
        channelMessages.splice(0, channelMessages.length - 100);
      }
      
      // Incrementar contador de não lidas se não for o canal atual
      const newUnreadCount = newMessage.channel !== currentChannel 
        ? state.unreadCounts[newMessage.channel] + 1
        : state.unreadCounts[newMessage.channel];
      
      return {
        messages: {
          ...state.messages,
          [newMessage.channel]: channelMessages,
        },
        unreadCounts: {
          ...state.unreadCounts,
          [newMessage.channel]: newUnreadCount,
        },
      };
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
