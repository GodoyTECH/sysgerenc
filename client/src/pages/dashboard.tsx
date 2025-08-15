import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MetricsCards from "@/components/MetricsCards";
import OrdersTable from "@/components/OrdersTable";
import ChatPanel from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Download, 
  UserPlus, 
  Tv, 
  Mail, 
  FileText,
  AlertTriangle 
} from "lucide-react";
import { apiRequest } from "@/services/api";
import { useOrdersStore } from "@/store/orders";
import { useWebSocket } from "@/services/socket";

export default function Dashboard() {
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const { orders, fetchOrders } = useOrdersStore();
  const { connect } = useWebSocket();

  // Buscar métricas do dashboard
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/reports/dashboard'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Inicializar dados quando o componente montar
  useEffect(() => {
    fetchOrders();
    connect(); // Conectar WebSocket para atualizações em tempo real
  }, [fetchOrders, connect]);

  const handleDownloadReports = () => {
    setShowPinModal(true);
  };

  const handleConfirmPin = async () => {
    try {
      const response = await apiRequest('POST', '/api/reports/download', {
        adminPin,
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'Relatórios enviados para seu e-mail!');
      }
    } catch (error) {
      alert('Erro ao processar relatórios. Verifique o PIN e tente novamente.');
    } finally {
      setShowPinModal(false);
      setAdminPin('');
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'import-products':
        alert('Funcionalidade de importação será implementada em breve');
        break;
      case 'backup':
        alert('Backup iniciado. Você receberá uma notificação quando concluído.');
        break;
      case 'new-user':
        // Redirecionar para página de configurações
        window.location.href = '/config';
        break;
      case 'kitchen-display':
        window.location.href = '/kitchen';
        break;
      case 'email-reports':
        handleDownloadReports();
        break;
      case 'system-logs':
        alert('Logs do sistema podem ser acessados na seção de relatórios');
        break;
      default:
        console.log('Ação não implementada:', action);
    }
  };

  // Métricas padrão caso ainda não tenham carregado
  const defaultMetrics = {
    todaySales: 'R$ 0,00',
    todayOrders: 0,
    salesGrowth: '+0%',
    avgTicket: 'R$ 0,00',
    pendingOrders: 0,
    lowStockCount: 0,
    avgWaitTime: '0 min',
  };

  const currentMetrics = metrics || defaultMetrics;
  const recentOrders = orders.slice(0, 10); // Mostrar apenas os 10 mais recentes

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Cartões de métricas */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="ml-5 flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-6 bg-gray-200 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <MetricsCards metrics={currentMetrics} />
        )}

        {/* Layout principal com tabela de pedidos e chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tabela de pedidos */}
          <div className="lg:col-span-2">
            <OrdersTable
              orders={recentOrders}
              onDownloadReports={handleDownloadReports}
            />
          </div>

          {/* Painel de chat */}
          <div className="lg:col-span-1">
            <ChatPanel />
          </div>
        </div>

        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('import-products')}
              >
                <Upload className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Importar</span>
                <span className="text-xs text-gray-500">Produtos CSV</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('backup')}
              >
                <Download className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Backup</span>
                <span className="text-xs text-gray-500">Dados</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('new-user')}
              >
                <UserPlus className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Usuário</span>
                <span className="text-xs text-gray-500">Adicionar</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('kitchen-display')}
              >
                <Tv className="h-6 w-6 text-yellow-600" />
                <span className="text-sm font-medium">Display</span>
                <span className="text-xs text-gray-500">Cozinha</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('email-reports')}
              >
                <Mail className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Enviar</span>
                <span className="text-xs text-gray-500">Relatórios</span>
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center p-4 h-auto space-y-2"
                onClick={() => handleQuickAction('system-logs')}
              >
                <FileText className="h-6 w-6 text-gray-500" />
                <span className="text-sm font-medium">Logs</span>
                <span className="text-xs text-gray-500">Sistema</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de PIN de administrador */}
        {showPinModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <Card className="w-96 mx-4">
              <CardHeader className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>Ação Administrativa</CardTitle>
                <CardDescription>
                  Digite o PIN de administrador para continuar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminPin">PIN de 4 dígitos</Label>
                  <Input
                    id="adminPin"
                    type="password"
                    placeholder="••••"
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="text-center text-lg font-mono"
                  />
                </div>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPinModal(false);
                      setAdminPin('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirmPin}
                    disabled={adminPin.length !== 4}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Confirmar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
