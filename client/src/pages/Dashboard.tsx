/**
 * GodoySys - Dashboard Principal
 * 
 * Esta página exibe o painel principal com métricas em tempo real,
 * pedidos recentes, chat interno e ações rápidas.
 */

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Plus,
  Download,
  Eye,
  MessageCircle,
  Users,
  Package,
  Activity,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useCurrency } from '@/store/useCompanyStore';
import { useUser, usePermissions } from '@/store/useAuthStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useChatStore, useActiveChannel } from '@/store/useChatStore';

import MetricsCard from '@/components/common/MetricsCard';
import OrderCard from '@/components/common/OrderCard';
import ChatMessage from '@/components/common/ChatMessage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Interface para métricas do dashboard
interface DashboardMetrics {
  todaySales: number;
  pendingOrders: number;
  avgTicket: number;
  lowStockCount: number;
}

interface SalesData {
  date: string;
  sales: number;
  orders: number;
  formattedDate: string;
}

interface DashboardData {
  todayMetrics: DashboardMetrics;
  salesByDay: SalesData[];
  weekSummary: {
    totalSales: number;
    totalOrders: number;
    averageDailySales: number;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { user, company } = useUser();
  const { isAdmin, canViewReports } = usePermissions();
  
  const { fetchOrders, orders } = useOrderStore();
  const { fetchChannels, fetchMessages, setActiveChannel } = useChatStore();
  const { messages } = useActiveChannel();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingReports, setIsDownloadingReports] = useState(false);

  // Carregar dados do dashboard
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Carregar pedidos recentes
  useEffect(() => {
    fetchOrders({ limit: 10 });
  }, [fetchOrders]);

  // Carregar chat
  useEffect(() => {
    fetchChannels();
    fetchMessages('general');
  }, [fetchChannels, fetchMessages]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Carregando dados do dashboard...');

      const response = await api.get('/reports/dashboard');
      setDashboardData(response.data);

      console.log('✅ Dados do dashboard carregados');
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as métricas do dashboard',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReports = async () => {
    if (!isAdmin) {
      toast({
        title: 'Acesso Negado',
        description: 'Apenas administradores podem baixar relatórios completos',
        variant: 'destructive',
      });
      return;
    }

    // Solicitar PIN e email do admin
    const adminPin = prompt('Digite o PIN de administrador:');
    if (!adminPin) return;

    const email = prompt('Digite o email para envio dos relatórios:');
    if (!email) return;

    try {
      setIsDownloadingReports(true);
      console.log('📊 Solicitando download de relatórios...');

      await api.post('/reports/download', {
        adminPin,
        email,
        includeAuditLogs: false,
      });

      toast({
        title: 'Relatórios Solicitados',
        description: `Os relatórios estão sendo processados e serão enviados para ${email}`,
      });

      console.log('✅ Relatórios solicitados com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao solicitar relatórios:', error);
      
      let errorMessage = 'Erro ao solicitar relatórios';
      if (error?.code === 'INVALID_ADMIN_PIN') {
        errorMessage = 'PIN de administrador inválido';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloadingReports(false);
    }
  };

  // Pedidos recentes para exibir
  const recentOrders = orders.slice(0, 4);

  // Mensagens recentes do chat
  const recentMessages = messages.slice(-3);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status online */}
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Sistema Online</span>
          </div>

          {/* Botão de relatórios */}
          {canViewReports && (
            <Button 
              onClick={handleDownloadReports}
              disabled={isDownloadingReports}
              className="bg-primary hover:bg-primary/90"
            >
              {isDownloadingReports ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Processando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Baixar Relatórios
                </div>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Métricas principais */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard
            title="Vendas Hoje"
            value={formatCurrency(dashboardData.todayMetrics.todaySales)}
            change="+12%"
            trend="up"
            icon={DollarSign}
            description="vs. ontem"
            color="green"
          />
          
          <MetricsCard
            title="Pedidos Pendentes"
            value={dashboardData.todayMetrics.pendingOrders.toString()}
            change="Tempo médio: 15min"
            icon={Clock}
            color="yellow"
          />
          
          <MetricsCard
            title="Ticket Médio"
            value={formatCurrency(dashboardData.todayMetrics.avgTicket)}
            change="+5%"
            trend="up"
            icon={TrendingUp}
            description="vs. semana"
            color="blue"
          />
          
          <MetricsCard
            title="Estoque Baixo"
            value={`${dashboardData.todayMetrics.lowStockCount} itens`}
            change="Requer atenção"
            icon={AlertTriangle}
            color="red"
          />
        </div>
      )}

      {/* Layout principal com duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pedidos recentes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Pedidos Recentes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Últimos pedidos do sistema
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <Link href="/pdv">
                    <Plus className="w-4 h-4 mr-1" />
                    Novo Pedido
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/orders">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Todos
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum pedido encontrado</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/pdv">Criar Primeiro Pedido</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <OrderCard key={order.id} order={order} compact />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat interno */}
        <div>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat Interno
                </CardTitle>
                <p className="text-sm text-muted-foreground">#geral</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/chat">Ver Chat</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma mensagem recente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMessages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message} 
                      compact 
                    />
                  ))}
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setActiveChannel('general')}
                asChild
              >
                <Link href="/chat">Participar da Conversa</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button variant="outline" asChild className="h-auto flex-col py-4">
              <Link href="/products">
                <Package className="w-6 h-6 mb-2 text-primary" />
                <span className="text-xs font-medium">Produtos</span>
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="h-auto flex-col py-4">
              <Link href="/kitchen">
                <Clock className="w-6 h-6 mb-2 text-yellow-600" />
                <span className="text-xs font-medium">Cozinha</span>
              </Link>
            </Button>
            
            {canViewReports && (
              <Button variant="outline" asChild className="h-auto flex-col py-4">
                <Link href="/reports">
                  <TrendingUp className="w-6 h-6 mb-2 text-green-600" />
                  <span className="text-xs font-medium">Relatórios</span>
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild className="h-auto flex-col py-4">
              <Link href="/chat">
                <MessageCircle className="w-6 h-6 mb-2 text-blue-600" />
                <span className="text-xs font-medium">Chat</span>
              </Link>
            </Button>
            
            {isAdmin && (
              <Button variant="outline" asChild className="h-auto flex-col py-4">
                <Link href="/config">
                  <Users className="w-6 h-6 mb-2 text-purple-600" />
                  <span className="text-xs font-medium">Usuários</span>
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild className="h-auto flex-col py-4">
              <Link href="/orders">
                <Eye className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-xs font-medium">Ver Pedidos</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações da empresa */}
      {company && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{company.name}</h3>
                <p className="text-sm text-muted-foreground">{company.email}</p>
              </div>
              <Badge variant="outline" className="text-green-700 border-green-200">
                Multi-tenant
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
