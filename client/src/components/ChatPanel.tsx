import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  channel: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const channels = [
  { id: 'general', name: '#geral', color: 'bg-blue-600' },
  { id: 'support', name: '#suporte', color: 'bg-green-600' },
  { id: 'kitchen', name: '#cozinha', color: 'bg-orange-600' },
];

export default function ChatPanel() {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    currentChannel, 
    unreadCounts,
    fetchMessages, 
    sendMessage, 
    setCurrentChannel 
  } = useChatStore();
  const { user } = useAuthStore();

  const currentMessages = messages[currentChannel] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  useEffect(() => {
    // Carregar mensagens do canal atual ao montar o componente
    fetchMessages(currentChannel);
  }, [currentChannel, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    
    const success = await sendMessage(currentChannel, messageInput);
    if (success) {
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-purple-600';
      case 'manager':
        return 'text-blue-600';
      case 'kitchen':
        return 'text-orange-600';
      case 'attendant':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Gerente';
      case 'kitchen':
        return 'Cozinha';
      case 'attendant':
        return 'Atendente';
      default:
        return role;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header do Chat */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Chat Interno</h3>
          <div className="flex space-x-1">
            {channels.map((channel) => (
              <Button
                key={channel.id}
                variant={currentChannel === channel.id ? "default" : "outline"}
                size="sm"
                className={`text-xs relative ${
                  currentChannel === channel.id 
                    ? `${channel.color} text-white` 
                    : 'text-gray-700'
                }`}
                onClick={() => setCurrentChannel(channel.id)}
              >
                {channel.name}
                {unreadCounts[channel.id] > 0 && currentChannel !== channel.id && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-red-500 text-white"
                  >
                    {unreadCounts[channel.id] > 9 ? '9+' : unreadCounts[channel.id]}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <ScrollArea className="flex-1 p-4" style={{ maxHeight: '400px' }}>
        <div className="space-y-4">
          {currentMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          ) : (
            currentMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {message.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className={`text-sm font-medium ${getRoleColor(message.userRole)}`}>
                      {message.userName}
                    </p>
                    <span className="text-xs text-gray-400">
                      ({getRoleLabel(message.userRole)})
                    </span>
                    <p className="text-xs text-gray-500">
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input para Enviar Mensagem */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Digite sua mensagem..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 text-sm"
            disabled={!user}
          />
          <Button
            type="submit"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!messageInput.trim() || !user}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
