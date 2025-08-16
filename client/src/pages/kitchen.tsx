/**
 * GodoySys - Tela da Cozinha
 * 
 * Esta página implementa uma interface otimizada para a cozinha,
 * mostrando pedidos pendentes e em preparação com foco na produção.
 */

import { useState, useEffect } from 'react';
import { 
  Clock, 
  ChefHat, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Timer,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import { api } from '@/services/api';
import { useOrderStore } from '@/store/useOrderStore';
import { useCurrency } from '@/store/useCompanyStore';
import { usePermissions } from '@/store/useAuthStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Interface para dados da tela da cozinha
interface KitchenOrder {
  id: string;
  customerName?: string;
  table?: string;
  status: 'pending' | 'preparing' | 'ready';
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }[];
  notes?: string;
  createdAt: string;
  waitingTime: number; // em minutos
}

interface KitchenData {
  orders: KitchenOrder[];
  summary: {
    pending: number;
    preparing: number;
    total: number;
  };
  lastUpdated: string;
}

export default function Kitchen() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { canAccessKitchen } = usePermissions();
  const { updateOrderStatus } = useOrderStore();
  
  const [kitchenData, setKitchenData] = useState<KitchenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Verificar permissões
  if (!canAccessKitchen) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar a tela da cozinha.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Carregar dados da cozinha
  useEffect(() => {
    loadKitchenData();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadKitchenData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadKitchenData = async () => {
    try {
      console.log('👨‍🍳 Carregando dados da cozinha...');
      
      const response = await api.get('/orders/kitchen/display');
      setKitchenData(response.data);

      console.log(`✅ ${response.data.orders.length} pedidos da cozinha carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar dados da cozinha:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os pedidos da cozinha',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar preparação do pedido
  const handleStartPreparing = async (orderId: string) => {
    try {
      setIsUpdatingStatus(orderId);
      console.log(`👨‍🍳 Iniciando preparação do pedido ${orderId}...`);

      const success = await updateOrderStatus(
        orderId, 
        'preparing',
        'Pedido iniciado na cozinha'
      );

      if (success) {
        toast({
          title: 'Preparação iniciada',
          description: 'Pedido foi marcado como "Em Preparação"',
        });
        
        // Recarregar dados
        await loadKitchenData();
      }

    } catch (error) {
      console.error('❌ Erro ao iniciar preparação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a preparação do pedido',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Marcar como pronto
  const handleMarkReady = async (orderId: string) => {
    try {
      setIsUpdatingStatus(orderId);
      console.log(`👨‍🍳 Marcando pedido ${orderId} como pronto...`);

      const success = await updateOrderStatus(
        orderId, 
        'ready',
        'Pedido finalizado na cozinha'
      );

      if (success) {
        toast({
          title: 'Pedido pronto!',
          description: 'Pedido foi marcado como "Pronto para entrega"',
        });
        
        // Recarregar dados
        await loadKitchenData();
      }

    } catch (error) {
      console.error('❌ Erro ao marcar como pronto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar o pedido como pronto',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Obter cor do tempo de espera
  const getWaitingTimeColor = (waitingTime: number) => {
    if (waitingTime < 15) return 'text-green-600';
    if (waitingTime < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!kitchenData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
            <p className="text-gray-600 mb-4">
              Não foi possível carregar os dados da cozinha.
            </p>
            <Button onClick={loadKitchenData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { orders, summary } = kitchenData;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      
      {/* Header da cozinha */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-600" />
            Cozinha
          </h1>
          <p className="text-gray-600">
            Display em tempo real para produção
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Última atualização</div>
            <div className="text-sm font-medium">
              {new Date(kitchenData.lastUpdated).toLocaleTimeString('pt-BR')}
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={loadKitchenData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Resumo da cozinha */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-yellow-200">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {summary.pending}
            </div>
            <div className="text-sm text-gray-600">Aguardando Preparo</div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {summary.preparing}
            </div>
            <div className="text-sm text-gray-600">Em Preparação</div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {summary.total}
            </div>
            <div className="text-sm text-gray-600">Total na Fila</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-16">
                <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum pedido na fila
                </h3>
                <p className="text-gray-500">
                  Todos os pedidos foram processados. Bom trabalho! 👨‍🍳
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          orders.map((order) => (
            <Card 
              key={order.id} 
              className={`${
                order.waitingTime > 30 ? 'border-red-300 bg-red-50' : 
                order.waitingTime > 15 ? 'border-yellow-300 bg-yellow-50' : 
                'border-gray-200'
              } transition-all duration-200`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Pedido #{order.id.slice(0, 8)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {order.customerName && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-3 h-3 mr-1" />
                          {order.customerName}
                        </div>
                      )}
                      {order.table && (
                        <Badge variant="outline" className="text-xs">
                          {order.table}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      className={`${getStatusColor(order.status)} border`}
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
                    <div className={`text-sm font-medium mt-1 ${getWaitingTimeColor(order.waitingTime)}`}>
                      <Timer className="w-3 h-3 inline mr-1" />
                      {order.waitingTime}min
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Itens do pedido */}
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center p-2 bg-white rounded border"
                    >
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        {item.notes && (
                          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mt-1">
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {item.quantity}x
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {/* Observações gerais */}
                {order.notes && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-xs font-medium text-blue-800 mb-1">
                      Observações:
                    </div>
                    <div className="text-sm text-blue-700">
                      {order.notes}
                    </div>
                  </div>
                )}
                
                {/* Ações */}
                <div className="flex gap-2 pt-3">
                  {order.status === 'pending' && (
                    <Button 
                      onClick={() => handleStartPreparing(order.id)}
                      disabled={isUpdatingStatus === order.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdatingStatus === order.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <ChefHat className="w-4 h-4" />
                          Iniciar Preparo
                        </div>
                      )}
                    </Button>
                  )}
                  
                  {order.status === 'preparing' && (
                    <Button 
                      onClick={() => handleMarkReady(order.id)}
                      disabled={isUpdatingStatus === order.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isUpdatingStatus === order.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Marcar Pronto
                        </div>
                      )}
                    </Button>
                  )}
                  
                  {order.status === 'ready' && (
                    <div className="flex-1 text-center py-2 bg-green-100 text-green-800 rounded font-medium">
                      ✅ Pronto para entrega
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
