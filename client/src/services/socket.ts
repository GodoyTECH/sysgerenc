import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { useChatStore } from '@/store/chat';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 segundos
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  // Inicializar conexão WebSocket
  connect() {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      console.log('Usuário não autenticado, não conectando ao WebSocket');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔗 Conexão WebSocket estabelecida');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Inscrever-se para atualizações da empresa
        this.send({
          type: 'SUBSCRIBE_COMPANY',
          data: { companyId: user.companyId },
        });

        this.startHeartbeat();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 Conexão WebSocket fechada');
        this.isConnected = false;
        this.stopHeartbeat();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectInterval);
        } else {
          console.error('Máximo de tentativas de reconexão atingido');
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error);
      };
      
    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
    }
  }

  // Desconectar WebSocket
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Enviar mensagem via WebSocket
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket não está conectado');
    }
  }

  // 🔹 Adicionados para compatibilidade com o chat.tsx
  joinChannel(channel: string) {
    this.send({ type: 'JOIN_CHANNEL', data: { channel } });
  }

  leaveChannel(channel: string) {
    this.send({ type: 'LEAVE_CHANNEL', data: { channel } });
  }

  // Processar mensagens recebidas
  private handleMessage(message: any) {
    switch (message.type) {
      case 'NEW_ORDER':
        console.log('📋 Novo pedido recebido:', message.data);
        useOrdersStore.getState().fetchOrders();
        this.showNotification('Novo Pedido', `Pedido #${message.data.id} recebido`);
        break;
        
      case 'ORDER_STATUS_UPDATE':
        console.log('📝 Status do pedido atualizado:', message.data);
        useOrdersStore.getState().fetchOrders();
        break;
        
      case 'CHAT_MESSAGE':
        console.log('💬 Nova mensagem do chat:', message.data);
        useChatStore.getState().addMessageFromWebSocket(message.data);
        break;
        
      case 'LOW_STOCK_ALERT':
        console.log('⚠️ Alerta de estoque baixo:', message.data);
        this.showNotification('Estoque Baixo', `${message.data.productName} está com estoque baixo`);
        break;
        
      case 'PONG':
        break;
        
      default:
        console.log('Mensagem WebSocket não reconhecida:', message);
    }
  }

  // Heartbeat
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING' });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Notificação do sistema
  private showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Instância singleton
export const wsService = new WebSocketService();

// Hook React
export function useWebSocket() {
  return {
    connect: () => wsService.connect(),
    disconnect: () => wsService.disconnect(),
    send: (message: any) => wsService.send(message),
    joinChannel: (channel: string) => wsService.joinChannel(channel),
    leaveChannel: (channel: string) => wsService.leaveChannel(channel),
    isConnected: () => wsService.isSocketConnected(),
  };
}

// Auto conectar/desconectar no login/logout
useAuthStore.subscribe((state) => {
  if (state.user && !wsService.isSocketConnected()) {
    wsService.connect();
  } else if (!state.user && wsService.isSocketConnected()) {
    wsService.disconnect();
  }
});

// Solicitar permissão para notificações
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
