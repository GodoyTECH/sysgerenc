import { WebSocketServer, WebSocket } from "ws";

// Interface para mensagens WebSocket
interface WebSocketMessage {
  type: string;
  data: any;
  companyId?: string;
}

// Map para armazenar conexões por empresa
const connectionsByCompany = new Map<string, Set<WebSocket>>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, request) => {
    console.log('Nova conexão WebSocket estabelecida');

    // Configurar heartbeat para manter conexão viva
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Listener para mensagens do cliente
    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'SUBSCRIBE_COMPANY':
            // Inscrever o WebSocket para receber atualizações da empresa
            const { companyId } = message.data;
            if (companyId) {
              if (!connectionsByCompany.has(companyId)) {
                connectionsByCompany.set(companyId, new Set());
              }
              connectionsByCompany.get(companyId)!.add(ws);
              console.log(`Cliente inscrito na empresa: ${companyId}`);
            }
            break;
            
          case 'PING':
            // Responder com pong para manter conexão
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;
            
          default:
            console.log('Tipo de mensagem WebSocket desconhecido:', message.type);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });

    // Cleanup quando a conexão é fechada
    ws.on('close', () => {
      console.log('Conexão WebSocket fechada');
      // Remover o WebSocket de todas as empresas
      connectionsByCompany.forEach((connections, companyId) => {
        connections.delete(ws);
        if (connections.size === 0) {
          connectionsByCompany.delete(companyId);
        }
      });
    });

    // Tratamento de erros
    ws.on('error', (error) => {
      console.error('Erro na conexão WebSocket:', error);
    });
  });

  // Configurar ping interval para detectar conexões mortas
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 segundos

  // Cleanup do interval quando o servidor é fechado
  wss.on('close', () => {
    clearInterval(interval);
  });
}

// Função para broadcast de mensagens para uma empresa específica
export function broadcastToCompany(companyId: string, message: WebSocketMessage) {
  const connections = connectionsByCompany.get(companyId);
  if (!connections) return;

  const messageString = JSON.stringify(message);
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageString);
    }
  });
}

// Função para broadcast global
export function broadcastToAll(message: WebSocketMessage) {
  connectionsByCompany.forEach((connections) => {
    const messageString = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageString);
      }
    });
  });
}

// Extender o tipo WebSocket para incluir isAlive
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}
