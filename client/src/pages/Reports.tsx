/**
 * GodoySys - Página de Relatórios
 * 
 * Esta página exibe relatórios de vendas, produtos e estatísticas
 * com opções de filtros e exportação em diferentes formatos.
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  DollarSign,
  Package,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Filter,
  RefreshCw,
  Mail,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

import { api } from '@/services/api';
import { useCurrency } from '@/store/useCompanyStore';
import { usePermissions, useUser } from '@/store/useAuthStore';
import MetricsCard from '@/components/common/MetricsCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Tipos para relatórios
interface SalesReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSales: string;
    totalOrders: number;
    averageTicket: string;
    cancelledOrders: number;
  };
  salesByDay: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  orders: any[];
}

interface ProductsReport {
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    lowStockProducts: number;
    totalStockValue: string;
  };
  lowStock: any[];
  products: any[];
  categories: any[];
}

interface ReportFilters {
  dateStart: string;
  dateEnd: string;
  format: 'json' | 'csv';
}

export default function Reports() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { canViewReports, isAdmin } = usePermissions();
  const { user } = useUser();
  
  const [activeTab, setActiveTab] = useState('sales');
  const [isLoading, setIsLoading] = useState(false);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [productsReport, setProductsReport] = useState<ProductsReport | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState<ReportFilters>({
    dateStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateEnd: new Date().toISOString().split('T')[0],
    format: 'json',
  });
  
  // Modal de download completo
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadEmail, setDownloadEmail] = useState('');
  const [downloadPin, setDownloadPin] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Verificar permissões
  if (!canViewReports) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para visualizar relatórios.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Carregar relatórios ao montar e quando filtros mudarem
  useEffect(() => {
    if (activeTab === 'sales') {
      loadSalesReport();
    } else if (activeTab === 'products') {
      loadProductsReport();
    }
  }, [activeTab, filters.dateStart, filters.dateEnd]);

  const loadSalesReport = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Carregando relatório de vendas...');

      const params = new URLSearchParams({
        dateStart: new Date(filters.dateStart).toISOString(),
        dateEnd: new Date(filters.dateEnd + 'T23:59:59').toISOString(),
        format: 'json',
      });

      const response = await api.get(`/reports/sales?${params}`);
      setSalesReport(response.data);

      console.log('✅ Relatório de vendas carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar relatório de vendas:', error);
      toast({
        title: 'Erro ao carregar relatório',
        description: 'Não foi possível carregar o relatório de vendas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductsReport = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Carregando relatório de produtos...');

      const response = await api.get('/reports/products?format=json');
      setProductsReport(response.data);

      console.log('✅ Relatório de produtos carregado');
    } catch (error) {
      console.error('❌ Erro ao carregar relatório de produtos:', error);
      toast({
        title: 'Erro ao carregar relatório',
        description: 'Não foi possível carregar o relatório de produtos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download de relatório específico em CSV
  const handleDownloadCSV = async (reportType: 'sales' | 'products') => {
    try {
      console.log(`📥 Baixando relatório ${reportType} em CSV...`);

      const params = new URLSearchParams({
        format: 'csv',
      });

      if (reportType === 'sales') {
        params.append('dateStart', new Date(filters.dateStart).toISOString());
        params.append('dateEnd', new Date(filters.dateEnd + 'T23:59:59').toISOString());
      }

      await api.download(`/reports/${reportType}?${params}`, `relatorio-${reportType}.csv`);

      toast({
        title: 'Download iniciado',
        description: `Relatório de ${reportType === 'sales' ? 'vendas' : 'produtos'} está sendo baixado`,
      });
    } catch (error) {
      console.error('❌ Erro no download:', error);
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar o relatório',
        variant: 'destructive',
      });
    }
  };

  // Download completo com PIN
  const handleCompleteDownload = async () => {
    if (!downloadEmail || !downloadPin) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha o email e PIN de administrador',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDownloading(true);
      console.log('📊 Solicitando relatórios completos...');

      await api.post('/reports/download', {
        adminPin: downloadPin,
        email: downloadEmail,
        includeAuditLogs: false,
      });

      toast({
        title: 'Relatórios solicitados!',
        description: `Os relatórios completos serão enviados para ${downloadEmail}`,
      });

      setShowDownloadModal(false);
      setDownloadEmail('');
      setDownloadPin('');

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
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Análises e estatísticas do negócio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => {
              if (activeTab === 'sales') loadSalesReport();
              else if (activeTab === 'products') loadProductsReport();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          {isAdmin && (
            <Button onClick={() => setShowDownloadModal(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Relatórios Completos
            </Button>
          )}
        </div>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateStart">Data Inicial</Label>
              <Input
                id="dateStart"
                type="date"
                value={filters.dateStart}
                onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateEnd">Data Final</Label>
              <Input
                id="dateEnd"
                type="date"
                value={filters.dateEnd}
                onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  setFilters({
                    ...filters,
                    dateStart: thirtyDaysAgo.toISOString().split('T')[0],
                    dateEnd: new Date().toISOString().split('T')[0],
                  });
                }}
                variant="outline"
                className="w-full"
              >
                Últimos 30 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de relatórios */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
        </TabsList>

        {/* Relatório de Vendas */}
        <TabsContent value="sales" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : salesReport ? (
            <>
              {/* Métricas de vendas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricsCard
                  title="Total de Vendas"
                  value={formatCurrency(parseFloat(salesReport.summary.totalSales))}
                  icon={DollarSign}
                  color="green"
                  description={`${salesReport.summary.totalOrders} pedidos`}
                />
                
                <MetricsCard
                  title="Ticket Médio"
                  value={formatCurrency(parseFloat(salesReport.summary.averageTicket))}
                  icon={TrendingUp}
                  color="blue"
                />
                
                <MetricsCard
                  title="Pedidos Entregues"
                  value={salesReport.summary.totalOrders.toString()}
                  icon={FileText}
                  color="purple"
                />
                
                <MetricsCard
                  title="Cancelamentos"
                  value={salesReport.summary.cancelledOrders.toString()}
                  icon={AlertCircle}
                  color="red"
                />
              </div>

              {/* Vendas por dia */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Vendas por Dia
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadCSV('sales')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {salesReport.salesByDay.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma venda no período selecionado
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {salesReport.salesByDay.map((day) => (
                        <div key={day.date} className="flex items-center justify-between p-4 border rounded">
                          <div>
                            <div className="font-medium">
                              {new Date(day.date).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {day.orders} pedidos
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {formatCurrency(day.sales)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Selecione um período para visualizar o relatório de vendas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Relatório de Produtos */}
        <TabsContent value="products" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : productsReport ? (
            <>
              {/* Métricas de produtos */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricsCard
                  title="Total de Produtos"
                  value={productsReport.summary.totalProducts.toString()}
                  icon={Package}
                  color="blue"
                  description={`${productsReport.summary.activeProducts} ativos`}
                />
                
                <MetricsCard
                  title="Categorias"
                  value={productsReport.summary.totalCategories.toString()}
                  icon={PieChart}
                  color="purple"
                />
                
                <MetricsCard
                  title="Estoque Baixo"
                  value={productsReport.summary.lowStockProducts.toString()}
                  icon={AlertTriangle}
                  color="red"
                />
                
                <MetricsCard
                  title="Valor do Estoque"
                  value={formatCurrency(parseFloat(productsReport.summary.totalStockValue))}
                  icon={DollarSign}
                  color="green"
                />
              </div>

              {/* Produtos com estoque baixo */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Produtos com Estoque Baixo
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadCSV('products')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {productsReport.lowStock.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Todos os produtos estão com estoque adequado!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productsReport.lowStock.slice(0, 10).map((product: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{product.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.categoria}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {product.estoque} un.
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                              Mín: {product.estoqueMinimo}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {productsReport.lowStock.length > 10 && (
                        <div className="text-center py-3 text-muted-foreground">
                          E mais {productsReport.lowStock.length - 10} produtos...
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Carregando relatório de produtos...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de download completo */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download de Relatórios Completos</DialogTitle>
            <DialogDescription>
              Os relatórios completos serão gerados em CSV e enviados por email.
              Esta ação requer PIN de administrador.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="downloadEmail">Email para envio</Label>
              <Input
                id="downloadEmail"
                type="email"
                placeholder="seu@email.com"
                value={downloadEmail}
                onChange={(e) => setDownloadEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="downloadPin">PIN de Administrador</Label>
              <Input
                id="downloadPin"
                type="password"
                placeholder="Digite seu PIN"
                value={downloadPin}
                onChange={(e) => setDownloadPin(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDownloadModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCompleteDownload}
              disabled={isDownloading || !downloadEmail || !downloadPin}
            >
              {isDownloading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Processando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Enviar Relatórios
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
