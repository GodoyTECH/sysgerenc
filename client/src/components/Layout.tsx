import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();
  const { unreadCounts } = useChatStore();
  
  // Calcular total de mensagens não lidas
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar móvel */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow border-b border-gray-200">
          <Button
            variant="ghost"
            size="icon"
            className="px-4 border-r border-gray-200 text-gray-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Indicador online */}
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="ml-2 text-sm text-gray-600">Online</span>
              </div>
              
              {/* Notificações */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </Button>

              {/* Perfil do usuário */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
