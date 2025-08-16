import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OrdersTable from "@/components/OrdersTable";
import { Search, Filter, RefreshCw } from "lucide-react";
import { useOrdersStore } from "@/store/orders";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  const { orders, fetchOrders, updateOrderStatus, isLoading } = useOrdersStore();
  const { toast } = useToast();

  // Carregar pedidos ao montar o componente
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Aplicar filtros
  const filteredOrders = orders.filter(order => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesSearch = !searchTerm || 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const orderDate = new Date(order.createdAt).toDateString();
      const filterDate = new Date(dateFilter).toDateString();
      matchesDate = orderDate === filterDate;
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  // Contar pedidos por status
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const success = await updateOrderStatus(orderId, newStatus);
    
    if (success) {
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    }
  };

  const handleRefresh = () => {
    fetchOrders({ status: statusFilter, date: dateFilter });
  };

  const getStatusBadgeProps = (status: string, count: number) => {
    const baseProps = {
      className: "cursor-pointer transition-colors",
      onClick: () => setStatusFilter(statusFilter === status ? '' : status)
    };

    switch (status) {
      case 'pending':
        return {
          ...baseProps,
          variant: statusFilter === status ? "default" : "secondary",
          className: `${baseProps.className} ${statusFilter === status ? 'bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`,
          children: `Aguardando (${count})`
        };
      case 'preparing':
        return {
          ...baseProps,
          variant: statusFilter === status ? "default" : "secondary",
          className: `${baseProps.className} ${statusFilter === status ? 'bg-yellow-600' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`,
          children: `Preparando (${count})`
        };
      case 'ready':
        return {
          ...baseProps,
          variant: statusFilter === status ? "default" : "secondary", 
          className: `${baseProps.className} ${statusFilter === status ? 'bg-green-600' : 'bg-green-100 text-green-800 hover:bg-green-200'}`,
          children: `Pronto (${count})`
        };
      case 'delivered':
        return {
          ...baseProps,
          variant: statusFilter === status ? "default" : "secondary",
          className: `${baseProps.className} ${statusFilter === status ? 'bg-blue-600' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`,
          children: `Entregue (${count})`
        };
      default:
        return {
          ...baseProps,
          children: `Todos (${count})`
        };
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Pedidos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualize e gerencie todos os pedidos do estabelecimento
          </p>
        </div>

        {/* Cartões de status */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Badge 
                variant="secondary" 
                className={`mb-2 ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                onClick={() => setStatusFilter('')}
              >
                Todos
              </Badge>
              <p className="text-2xl font-bold">{statusCounts.all}</p>
              <p className="text-sm text-gray-600">Total</p>
            </CardContent>
          </Card>

          {[
            { key: 'pending', label: 'Aguardando', color: 'gray' },
            { key: 'preparing', label: 'Preparando', color: 'yellow' },
            { key: 'ready', label: 'Pronto', color: 'green' },
            { key: 'delivered', label: 'Entregue', color: 'blue' },
          ].map(status => {
            const badgeProps = getStatusBadgeProps(status.key, statusCounts[status.key]);
            return (
              <Card key={status.key} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Badge {...badgeProps} className="mb-2">
                    {badgeProps.children}
                  </Badge>
                  <p className="text-2xl font-bold">{statusCounts[status.key]}</p>
                  <p className="text-sm text-gray-600">{status.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Cliente, pedido, mesa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="pending">Aguardando</SelectItem>
                    <SelectItem value="preparing">Preparando</SelectItem>
                    <SelectItem value="ready">Pronto</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de pedidos */}
        <OrdersTable
          orders={filteredOrders}
          onViewOrder={(orderId) => {
            // Aqui você pode implementar um modal ou página de detalhes do pedido
            console.log('Ver pedido:', orderId);
          }}
        />

        {/* Estatísticas rápidas */}
        {filteredOrders.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Resumo dos Pedidos Filtrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    R$ {filteredOrders
                      .filter(o => o.paymentStatus === 'paid')
                      .reduce((sum, order) => sum + parseFloat(order.total), 0)
                      .toFixed(2)
                    }
                  </p>
                  <p className="text-sm text-gray-600">Receita dos pedidos pagos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {filteredOrders.length > 0 
                      ? (filteredOrders.reduce((sum, order) => sum + parseFloat(order.total), 0) / filteredOrders.length).toFixed(2)
                      : '0.00'
                    }
                  </p>
                  <p className="text-sm text-gray-600">Ticket médio</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {filteredOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
                  </p>
                  <p className="text-sm text-gray-600">Pedidos pendentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {filteredOrders.filter(o => o.paymentStatus === 'pending').length}
                  </p>
                  <p className="text-sm text-gray-600">Pagamentos pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
