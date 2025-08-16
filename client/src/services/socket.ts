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
      // Determinar protocolo baseado no protocolo HTTP atual
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
        
        // Iniciar heartbeat
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
        
        // Tentar reconectar se não foi fechamento intencional
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            this.connect();
          }, this.reconnectInterval);
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

  // Processar mensagens recebidas
  private handleMessage(message: any) {
    switch (message.type) {
      case 'NEW_ORDER':
        console.log('📋 Novo pedido recebido:', message.data);
        // Atualizar store de pedidos
        useOrdersStore.getState().fetchOrders();
        
        // Mostrar notificação (pode implementar um toast aqui)
        this.showNotification('Novo Pedido', `Pedido #${message.data.id} recebido`);
        break;
        
      case 'ORDER_STATUS_UPDATE':
        console.log('📝 Status do pedido atualizado:', message.data);
        // Atualizar store de pedidos
        useOrdersStore.getState().fetchOrders();
        break;
        
      case 'CHAT_MESSAGE':
        console.log('💬 Nova mensagem do chat:', message.data);
        // Adicionar mensagem ao store de chat
        useChatStore.getState().addMessageFromWebSocket(message.data);
        break;
        
      case 'LOW_STOCK_ALERT':
        console.log('⚠️ Alerta de estoque baixo:', message.data);
        this.showNotification('Estoque Baixo', `${message.data.productName} está com estoque baixo`);
        break;
        
      case 'PONG':
        // Resposta do heartbeat
        break;
        
      default:
        console.log('Mensagem WebSocket não reconhecida:', message);
    }
  }

  // Sistema de heartbeat para manter conexão viva
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'PING' });
      }
    }, 30000); // 30 segundos
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Mostrar notificação do sistema (se suportado pelo navegador)
  private showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }

  // Verificar se está conectado
  isSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Instância singleton do WebSocket
export const wsService = new WebSocketService();

// Hook para usar o WebSocket em componentes React
export function useWebSocket() {
  return {
    connect: () => wsService.connect(),
    disconnect: () => wsService.disconnect(),
    send: (message: any) => wsService.send(message),
    isConnected: () => wsService.isSocketConnected(),
  };
}

// Inicializar WebSocket quando o usuário fizer login
useAuthStore.subscribe((state) => {
  if (state.user && !wsService.isSocketConnected()) {
    wsService.connect();
  } else if (!state.user && wsService.isSocketConnected()) {
    wsService.disconnect();
  }
});

// Solicitar permissão para notificações quando o módulo for carregado
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
