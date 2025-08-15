/**
 * GodoySys - Serviço de WebSocket
 * 
 * Este módulo gerencia conexões WebSocket para funcionalidades
 * em tempo real como chat e atualizações de pedidos.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IStorage } from '../storage';
import jwt from 'jsonwebtoken';

// Interface para conexão autenticada
interface AuthenticatedConnection {
  ws: WebSocket;
  userId: string;
  companyId: string;
  role: string;
  username: string;
  channels: Set<string>;
  lastActivity: Date;
}

// Mapa de conexões ativas por empresa
const connections = new Map<string, Map<string, AuthenticatedConnection>>();

// Tipos de mensagens WebSocket
interface WSMessage {
  type: 'join_channel' | 'leave_channel' | 'chat_message' | 'order_update' | 'ping' | 'pong';
  data: any;
  timestamp?: string;
}

/**
 * Autentica uma conexão WebSocket usando token JWT
 */
function authenticateConnection(token: string): { userId: string; companyId: string; role: string; username: string } | null {
  try {
    const jwtSecret = process.env.JWT_SECRET || "dev_secret_key";
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    return {
      userId: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
      username: decoded.username,
    };
  } catch (error) {
    console.error("❌ Erro na autenticação WebSocket:", error);
    return null;
  }
}

/**
 * Adiciona uma conexão autenticada
 */
function addConnection(auth: { userId: string; companyId: string; role: string; username: string }, ws: WebSocket) {
  const { userId, companyId } = auth;
  
  if (!connections.has(companyId)) {
    connections.set(companyId, new Map());
  }
  
  const companyConnections = connections.get(companyId)!;
  
  const connection: AuthenticatedConnection = {
    ws,
    ...auth,
    channels: new Set(),
    lastActivity: new Date(),
  };
  
  companyConnections.set(userId, connection);
  
  console.log(`🔌 WebSocket conectado: ${auth.username} (${companyId})`);
  console.log(`📊 Total de conexões: ${getTotalConnections()}`);
}

/**
 * Remove uma conexão
 */
function removeConnection(companyId: string, userId: string) {
  const companyConnections = connections.get(companyId);
  if (companyConnections) {
    const connection = companyConnections.get(userId);
    if (connection) {
      console.log(`🔌 WebSocket desconectado: ${connection.username} (${companyId})`);
      companyConnections.delete(userId);
      
      // Remover mapa da empresa se não há mais conexões
      if (companyConnections.size === 0) {
        connections.delete(companyId);
      }
    }
  }
  
  console.log(`📊 Total de conexões: ${getTotalConnections()}`);
}

/**
 * Obtém total de conexões ativas
 */
function getTotalConnections(): number {
  let total = 0;
  for (const companyConnections of connections.values()) {
    total += companyConnections.size;
  }
  return total;
}

/**
 * Obtém conexões de uma empresa
 */
function getCompanyConnections(companyId: string): AuthenticatedConnection[] {
  const companyConnections = connections.get(companyId);
  return companyConnections ? Array.from(companyConnections.values()) : [];
}

/**
 * Envia mensagem para conexões específicas
 */
function sendToConnections(connections: AuthenticatedConnection[], message: WSMessage) {
  const messageStr = JSON.stringify({
    ...message,
    timestamp: new Date().toISOString(),
  });
  
  connections.forEach(connection => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(messageStr);
    }
  });
}

/**
 * Broadcast de mensagem para todos os usuários de uma empresa
 */
export function broadcastToCompany(companyId: string, message: WSMessage) {
  const companyConnections = getCompanyConnections(companyId);
  sendToConnections(companyConnections, message);
}

/**
 * Broadcast de mensagem para usuários de um canal específico
 */
export function broadcastToChannel(companyId: string, channel: string, message: WSMessage) {
  const companyConnections = getCompanyConnections(companyId);
  const channelConnections = companyConnections.filter(conn => 
    conn.channels.has(channel)
  );
  sendToConnections(channelConnections, message);
}

/**
 * Broadcast de atualização de pedido
 */
export function broadcastOrderUpdate(companyId: string, orderData: any) {
  broadcastToCompany(companyId, {
    type: 'order_update',
    data: orderData,
  });
}

/**
 * Broadcast de nova mensagem de chat
 */
export function broadcastChatMessage(companyId: string, channel: string, messageData: any) {
  broadcastToChannel(companyId, channel, {
    type: 'chat_message',
    data: {
      channel,
      message: messageData,
    },
  });
}

/**
 * Configura o servidor WebSocket
 */
export function setupSocketService(wss: WebSocketServer, storage: IStorage) {
  console.log("🚀 Configurando serviço WebSocket...");

  wss.on('connection', (ws, req) => {
    console.log("🔌 Nova conexão WebSocket recebida");
    
    let isAuthenticated = false;
    let connectionAuth: { userId: string; companyId: string; role: string; username: string } | null = null;

    // Timeout para autenticação (30 segundos)
    const authTimeout = setTimeout(() => {
      if (!isAuthenticated) {
        console.log("❌ WebSocket: Timeout de autenticação");
        ws.close(1008, 'Authentication timeout');
      }
    }, 30000);

    // Handler de mensagens
    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        // Se não autenticado, esperar token de autenticação
        if (!isAuthenticated) {
          if (message.type === 'auth' && message.data.token) {
            connectionAuth = authenticateConnection(message.data.token);
            
            if (connectionAuth) {
              isAuthenticated = true;
              clearTimeout(authTimeout);
              addConnection(connectionAuth, ws);
              
              // Enviar confirmação de autenticação
              ws.send(JSON.stringify({
                type: 'auth_success',
                data: {
                  userId: connectionAuth.userId,
                  username: connectionAuth.username,
                  companyId: connectionAuth.companyId,
                },
                timestamp: new Date().toISOString(),
              }));
            } else {
              ws.close(1008, 'Invalid token');
            }
          } else {
            ws.close(1008, 'Authentication required');
          }
          return;
        }

        // Atualizar última atividade
        const companyConnections = connections.get(connectionAuth!.companyId);
        const userConnection = companyConnections?.get(connectionAuth!.userId);
        if (userConnection) {
          userConnection.lastActivity = new Date();
        }

        // Processar mensagem baseada no tipo
        switch (message.type) {
          case 'join_channel':
            const channel = message.data.channel;
            if (userConnection && ['general', 'support', 'kitchen'].includes(channel)) {
              userConnection.channels.add(channel);
              
              console.log(`📺 ${connectionAuth!.username} entrou no canal #${channel}`);
              
              // Enviar confirmação
              ws.send(JSON.stringify({
                type: 'channel_joined',
                data: { channel },
                timestamp: new Date().toISOString(),
              }));
            }
            break;

          case 'leave_channel':
            const leaveChannel = message.data.channel;
            if (userConnection) {
              userConnection.channels.delete(leaveChannel);
              
              console.log(`📺 ${connectionAuth!.username} saiu do canal #${leaveChannel}`);
              
              // Enviar confirmação
              ws.send(JSON.stringify({
                type: 'channel_left',
                data: { channel: leaveChannel },
                timestamp: new Date().toISOString(),
              }));
            }
            break;

          case 'ping':
            // Responder com pong para manter conexão viva
            ws.send(JSON.stringify({
              type: 'pong',
              data: {},
              timestamp: new Date().toISOString(),
            }));
            break;

          default:
            console.log(`⚠️ Tipo de mensagem WebSocket desconhecido: ${message.type}`);
        }

      } catch (error) {
        console.error("❌ Erro ao processar mensagem WebSocket:", error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Erro ao processar mensagem' },
          timestamp: new Date().toISOString(),
        }));
      }
    });

    // Handler de fechamento de conexão
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket fechado: ${code} - ${reason}`);
      
      if (isAuthenticated && connectionAuth) {
        removeConnection(connectionAuth.companyId, connectionAuth.userId);
      }
      
      clearTimeout(authTimeout);
    });

    // Handler de erro
    ws.on('error', (error) => {
      console.error("❌ Erro WebSocket:", error);
    });
  });

  // Limpeza periódica de conexões inativas
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
    
    for (const [companyId, companyConnections] of connections.entries()) {
      for (const [userId, connection] of companyConnections.entries()) {
        const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
        
        if (timeSinceActivity > inactiveThreshold) {
          if (connection.ws.readyState === WebSocket.OPEN) {
            // Enviar ping para verificar se ainda está ativo
            connection.ws.send(JSON.stringify({
              type: 'ping',
              data: {},
              timestamp: new Date().toISOString(),
            }));
          } else {
            // Remover conexão inativa
            removeConnection(companyId, userId);
          }
        }
      }
    }
  }, 2 * 60 * 1000); // Verificar a cada 2 minutos

  console.log("✅ Serviço WebSocket configurado");
  console.log("🔌 Aguardando conexões em /ws");
}

/**
 * Obtém estatísticas do WebSocket
 */
export function getSocketStats() {
  const stats = {
    totalConnections: getTotalConnections(),
    companiesConnected: connections.size,
    connectionsByCompany: {} as { [companyId: string]: number },
  };
  
  for (const [companyId, companyConnections] of connections.entries()) {
    stats.connectionsByCompany[companyId] = companyConnections.size;
  }
  
  return stats;
}
