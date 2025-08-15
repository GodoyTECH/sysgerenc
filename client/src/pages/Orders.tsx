/**
 * GodoySys - Página de Pedidos
 * 
 * Esta página gerencia visualização, filtros e atualizações
 * de status dos pedidos do sistema.
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Calendar,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import { useOrderStore, useOrdersByStatus } from '@/store/useOrderStore';
import { useCurrency } from '@/store/useCompanyStore';
import { usePermissions } from '@/store/useAuthStore';
import OrderCard from '@/components/common/OrderCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Tipos para filtros e modal
interface OrderFilters {
  status: string;
  dateRange: string;
  searchTerm: string;
}

interface StatusUpdateModal {
  isOpen: boolean;
  orderId: string;
  currentStatus: string;
  newStatus: string;
}

export default function Orders() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { canAccessKitchen } = usePermissions();
  
  const {
    fetchOrders,
    updateOrderStatus,
    orders,
    isLoading,
    setFilters,
    clearFilters,
  } = useOrderStore();
  
  const ordersByStatus = useOrdersByStatus();
  
  // Estado local
  const [filters, setLocalFilters] = useState<OrderFilters>({
    status: '',
    dateRange: 'today',
    searchTerm: '',
  });
  
  const [statusModal, setStatusModal] = useState<StatusUpdateModal>({
    isOpen: false,
    orderId: '',
    currentStatus: '',
    newStatus: '',
  });
  
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Carregar pedidos
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      console.log('🧾 Carregando pedidos...');
      
      // Preparar filtros para API
      const apiFilters: any = {};
      
      if (filters.status) {
        apiFilters.status = filters.status;
      }
      
      if (filters.dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        apiFilters.dateStart = today.toISOString();
      } else if (filters.dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        apiFilters.dateStart = weekAgo.toISOString();
      }
      
      await fetchOrders(apiFilters);
      console.log(`✅ ${orders.length} pedidos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
      toast({
        title: 'Erro ao carregar pedidos',
        description: 'Não foi possível carregar a lista de pedidos',
        variant: 'destructive',
      });
    }
  };

  // Aplicar filtros
  const handleApplyFilters = () => {
    setFilters(filters);
    loadOrders();
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setLocalFilters({
      status: '',
      dateRange: 'today',
      searchTerm: '',
    });
    clearFilters();
    loadOrders();
  };

  // Filtrar pedidos por busca
  const filteredOrders = orders.filter(order => {
    if (!filters.searchTerm) return true;
    
    const term = filters.searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(term) ||
      (order.customerName || '').toLowerCase().includes(term) ||
      (order.table || '').toLowerCase().includes(term)
    );
  });

  // Abrir modal de atualização de status
  const openStatusModal = (orderId: string, currentStatus: string, newStatus: string) => {
    setStatusModal({
      isOpen: true,
      orderId,
      currentStatus,
      newStatus,
    });
    setStatusNotes('');
  };

  // Fechar modal
  const closeStatusModal = () => {
    setStatusModal({
      isOpen: false,
      orderId: '',
      currentStatus: '',
      newStatus: '',
    });
    setStatusNotes('');
  };

  // Confirmar atualização de status
  const handleConfirmStatusUpdate = async () => {
    try {
      setIsUpdatingStatus(true);
      console.log(`🔄 Atualizando status do pedido ${statusModal.orderId}...`);

      const success = await updateOrderStatus(
        statusModal.orderId, 
        statusModal.newStatus,
        statusNotes || undefined
      );

      if (success) {
        toast({
          title: 'Status atualizado',
          description: `Pedido foi marcado como ${getStatusLabel(statusModal.newStatus)}`,
        });
        
        closeStatusModal();
        loadOrders(); // Recarregar lista
      } else {
        throw new Error('Falha ao atualizar status');
      }

    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error?.message || 'Não foi possível atualizar o status do pedido',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Obter label do status
  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Pendente',
      preparing: 'Em Preparação',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status as keyof typeof labels] || status;
  };

  // Obter cor do badge do status
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600">Gerencie todos os pedidos do sistema</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={loadOrders}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button asChild>
            <Link href="/pdv">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{ordersByStatus.pending.length}</div>
            <div className="text-sm text-gray-600">Pendentes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{ordersByStatus.preparing.length}</div>
            <div className="text-sm text-gray-600">Preparando</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{ordersByStatus.ready.length}</div>
            <div className="text-sm text-gray-600">Prontos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{ordersByStatus.delivered.length}</div>
            <div className="text-sm text-gray-600">Entregues</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{ordersByStatus.cancelled.length}</div>
            <div className="text-sm text-gray-600">Cancelados</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Busca */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="ID, cliente ou mesa..."
                  value={filters.searchTerm}
                  onChange={(e) => setLocalFilters(prev => ({ 
                    ...prev, 
                    searchTerm: e.target.value 
                  }))}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setLocalFilters(prev => ({ 
                  ...prev, 
                  status: value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="preparing">Em Preparação</SelectItem>
                  <SelectItem value="ready">Prontos</SelectItem>
                  <SelectItem value="delivered">Entregues</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => setLocalFilters(prev => ({ 
                  ...prev, 
                  dateRange: value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mês</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Ações */}
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pedidos ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">Nenhum pedido encontrado</p>
                <p className="text-sm">Ajuste os filtros ou crie um novo pedido</p>
              </div>
              <Button asChild>
                <Link href="/pdv">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Pedido
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  showActions
                  onStatusChange={openStatusModal}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de atualização de status */}
      <Dialog open={statusModal.isOpen} onOpenChange={closeStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status do Pedido</DialogTitle>
            <DialogDescription>
              Alterar status de "{getStatusLabel(statusModal.currentStatus)}" 
              para "{getStatusLabel(statusModal.newStatus)}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="statusNotes">Observações (opcional)</Label>
              <Textarea
                id="statusNotes"
                placeholder="Adicione uma observação sobre a mudança de status..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeStatusModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmStatusUpdate}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Atualizando...
                </div>
              ) : (
                'Confirmar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
