import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "./store/auth";
import { useEffect } from "react";

// Páginas
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PDV from "@/pages/pdv";
import Orders from "@/pages/orders";
import Kitchen from "@/pages/kitchen";
import Chat from "@/pages/chat";
import Products from "@/pages/products";
import Reports from "@/pages/reports";
import Config from "@/pages/config";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  if (!user) {
    return <Login />;
  }
  
  return <Layout>{children}</Layout>;
}

function Router() {
  const { user } = useAuthStore();

  return (
    <Switch>
      {/* Rota de login */}
      <Route path="/login">
        {user ? <Dashboard /> : <Login />}
      </Route>

      {/* Rotas protegidas */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/pdv">
        <ProtectedRoute>
          <PDV />
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      </Route>

      <Route path="/kitchen">
        <ProtectedRoute>
          <Kitchen />
        </ProtectedRoute>
      </Route>

      <Route path="/chat">
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      </Route>

      <Route path="/products">
        <ProtectedRoute>
          <Products />
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/config">
        <ProtectedRoute>
          <Config />
        </ProtectedRoute>
      </Route>

      {/* Fallback para 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    // Inicializar autenticação ao carregar a aplicação
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
