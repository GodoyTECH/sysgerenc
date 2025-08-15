/**
 * GodoySys - Aplicação Principal React
 * 
 * Este componente gerencia o roteamento principal da aplicação,
 * proteção de rotas e layout geral do sistema.
 */

import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";

// Importar páginas
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PDV from "@/pages/PDV";
import Orders from "@/pages/Orders";
import Kitchen from "@/pages/Kitchen";
import Chat from "@/pages/Chat";
import Reports from "@/pages/Reports";
import Products from "@/pages/Products";
import Config from "@/pages/Config";
import NotFound from "@/pages/not-found";

// Importar serviços
import { queryClient } from "@/lib/queryClient";
import { initializeSocket } from "@/services/socket";
import LoadingSpinner from "@/components/common/LoadingSpinner";

// Layout com sidebar para páginas autenticadas
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

/**
 * Componente de rota protegida
 * Verifica se o usuário está autenticado antes de renderizar
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

/**
 * Layout principal da aplicação autenticada
 */
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar de navegação */}
      <Sidebar />
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header superior */}
        <Header />
        
        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Componente de roteamento principal
 */
function Router() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Verificar autenticação ao carregar a aplicação
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Inicializar WebSocket apenas quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      initializeSocket();
    }
  }, [isAuthenticated]);

  return (
    <Switch>
      {/* Rota de login (pública) */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>

      {/* Rota raiz - redireciona baseado na autenticação */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>

      {/* Rotas protegidas com layout */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/pdv">
        <ProtectedRoute>
          <MainLayout>
            <PDV />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <MainLayout>
            <Orders />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/kitchen">
        <ProtectedRoute>
          <MainLayout>
            <Kitchen />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/chat">
        <ProtectedRoute>
          <MainLayout>
            <Chat />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <MainLayout>
            <Reports />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/products">
        <ProtectedRoute>
          <MainLayout>
            <Products />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/config">
        <ProtectedRoute>
          <MainLayout>
            <Config />
          </MainLayout>
        </ProtectedRoute>
      </Route>

      {/* Rota 404 */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

/**
 * Componente principal da aplicação
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
