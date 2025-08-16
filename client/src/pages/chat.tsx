/**
 * GodoySys - Página de Chat
 * 
 * Esta página implementa o sistema de chat interno com múltiplos canais
 * e funcionalidades em tempo real usando WebSocket.
 */

import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Hash, 
  Smile,
  Paperclip,
  MoreVertical,
  UserCheck,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { 
  useChatStore, 
  useActiveChannel, 
  useChatNotifications,
  useOnlineUsers 
} from '@/store/useChatStore';
import { useUser } from '@/store/useAuthStore';
import { joinChannel, leaveChannel, isSocketConnected } from '@/services/socket';
import ChatMessage from '@/components/common/ChatMessage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function Chat() {
  const { toast } = useToast();
  const { user } = useUser();
  
  const {
    channels,
    activeChannel,
    isLoading,
    isConnected,
    fetchChannels,
    setActiveChannel,
  } = useChatStore();
  
  const {
    messages,
    newMessage,
    setNewMessage,
    sendMessage: sendChannelMessage,
  } = useActiveChannel();
  
  const { channelNotifications } = useChatNotifications();
  const { onlineUsers, totalOnline, usersByRole } = useOnlineUsers();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar canais ao montar
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focar input quando canal muda
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChannel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Trocar de canal
  const handleChannelChange = (channelId: string) => {
    if (channelId === activeChannel) return;
    
    // Sair do canal atual
    if (activeChannel) {
      leaveChannel(activeChannel);
    }
    
    // Entrar no novo canal
    joinChannel(channelId);
    setActiveChannel(channelId);
    
    console.log(`💬 Mudou para canal #${channelId}`);
  };

  // Enviar mensagem
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const success = await sendChannelMessage();
    if (!success) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Verifique sua conexão e tente novamente',
        variant: 'destructive',
      });
    }
  };

  // Pressionar Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Obter informações do canal ativo
  const activeChannelInfo = channels.find(c => c.id === activeChannel);
  
  // Verificar se usuário pode acessar canal da cozinha
  const canAccessKitchen = user?.role && ['admin', 'manager', 'kitchen'].includes(user.role);

  return (
    <div className="p-6 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        
        {/* Sidebar com canais e usuários online */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status de conexão */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                <div>
                  <div className="font-medium">
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Chat em tempo real
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de canais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="w-5 h-5" />
                Canais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {channels.map((channel) => {
                const notification = channelNotifications.find(n => n.channel === channel.id);
                const isActive = channel.id === activeChannel;
                
                // Verificar acesso ao canal da cozinha
                if (channel.id === 'kitchen' && !canAccessKitchen) {
                  return null;
                }
                
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelChange(channel.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    
                    {notification && notification.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {notification.unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Usuários online */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Online ({totalOnline})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalOnline === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum usuário online</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(usersByRole).map(([role, users]) => {
                    if (users.length === 0) return null;
                    
                    const roleLabels = {
                      admin: 'Administradores',
                      manager: 'Gerentes', 
                      attendant: 'Atendentes',
                      kitchen: 'Cozinha',
                    };
                    
                    return (
                      <div key={role}>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          {roleLabels[role as keyof typeof roleLabels]}
                        </h4>
                        <div className="space-y-1">
                          {users.map((onlineUser) => (
                            <div key={onlineUser.id} className="flex items-center gap-2 p-2 rounded">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {onlineUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{onlineUser.name}</span>
                              <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Área principal do chat */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col">
            
            {/* Header do canal */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="w-6 h-6 text-primary" />
                  <div>
                    <CardTitle className="text-xl">
                      {activeChannelInfo?.name || `#${activeChannel}`}
                    </CardTitle>
                    {activeChannelInfo?.description && (
                      <p className="text-sm text-muted-foreground">
                        {activeChannelInfo.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {messages.length} mensagens
                  </Badge>
                  
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />

            {/* Lista de mensagens */}
            <CardContent className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium text-lg mb-2">Seja o primeiro a falar!</h3>
                  <p className="text-muted-foreground">
                    Este canal está aguardando sua primeira mensagem.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message}
                      showAvatar={
                        index === 0 || 
                        messages[index - 1]?.userId !== message.userId ||
                        new Date(message.createdAt).getTime() - new Date(messages[index - 1]?.createdAt || 0).getTime() > 300000
                      }
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>

            {/* Input de mensagem */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Mensagem #${activeChannel}...`}
                    disabled={!isConnected}
                    className="pr-20"
                  />
                  
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || !isConnected}
                  className="px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Enter para enviar, Shift+Enter para nova linha
                </span>
                {!isConnected && (
                  <span className="text-red-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Reconectando...
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
