import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Download } from "lucide-react";
import { useOrdersStore } from "@/store/orders";
import { useLocation } from "wouter";

interface Order {
  id: string;
  customerName?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  total: string;
  table?: string;
  createdAt: string;
  estimatedTime?: number;
}

interface OrdersTableProps {
  orders: Order[];
  showActions?: boolean;
  onViewOrder?: (orderId: string) => void;
  onDownloadReports?: () => void;
}

export default function OrdersTable({ 
  orders, 
  showActions = true, 
  onViewOrder, 
  onDownloadReports 
}: OrdersTableProps) {
  const [, setLocation] = useLocation();
  const { updateOrderStatus } = useOrdersStore();

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Aguardando</Badge>;
      case 'preparing':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Preparando</Badge>;
      case 'ready':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Pronto</Badge>;
      case 'delivered':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Entregue</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: Order['paymentStatus']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendente</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-300">Pago</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-300">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleNewOrder = () => {
    setLocation('/pdv');
  };

  const calculateTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}min`;
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
        <div className="flex space-x-2">
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleNewOrder}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo Pedido
          </Button>
          {onDownloadReports && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadReports}
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar Relatórios
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pedido
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagamento
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tempo
              </TableHead>
              {showActions && (
                <TableHead className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 7 : 6} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                    <p className="mt-1 text-sm">Os pedidos aparecerão aqui quando forem criados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id.slice(-6)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{order.customerName || 'Cliente não informado'}</div>
                      {order.table && (
                        <div className="text-gray-500">{order.table}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {parseFloat(order.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateTimeElapsed(order.createdAt)}
                  </TableCell>
                  {showActions && (
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={() => onViewOrder?.(order.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {orders.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">1</span> a{" "}
              <span className="font-medium">{orders.length}</span> pedidos
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled>
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
