import { storage } from "../storage";

// Interface para dados dos relatórios
interface ReportData {
  sales: any[];
  orders: any[];
  products: any[];
  topProducts: any[];
  lowStock: any[];
  auditLogs: any[];
  metrics: any;
}

// Função para gerar relatórios completos em formato CSV
export async function generateReportsCSV(companyId: string): Promise<string> {
  try {
    // Buscar todos os dados necessários para o relatório
    const reportData = await gatherReportData(companyId);
    
    let csvContent = "";
    
    // Cabeçalho do relatório
    csvContent += `RELATÓRIOS GODOY SYS\n`;
    csvContent += `Empresa ID: ${companyId}\n`;
    csvContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n`;
    csvContent += `\n`;
    
    // ===================== MÉTRICAS GERAIS =====================
    csvContent += `=== MÉTRICAS GERAIS ===\n`;
    csvContent += `Vendas Hoje,${reportData.metrics.todaySales || 'R$ 0,00'}\n`;
    csvContent += `Total de Pedidos Hoje,${reportData.metrics.todayOrders || 0}\n`;
    csvContent += `Ticket Médio,${reportData.metrics.avgTicket || 'R$ 0,00'}\n`;
    csvContent += `Pedidos Pendentes,${reportData.metrics.pendingOrders || 0}\n`;
    csvContent += `Produtos em Estoque Baixo,${reportData.metrics.lowStockCount || 0}\n`;
    csvContent += `\n`;
    
    // ===================== VENDAS POR DIA =====================
    csvContent += `=== VENDAS DOS ÚLTIMOS 30 DIAS ===\n`;
    csvContent += `Data,Vendas (R$),Número de Pedidos,Ticket Médio (R$)\n`;
    
    if (reportData.sales && reportData.sales.length > 0) {
      reportData.sales.forEach((sale: any) => {
        csvContent += `${sale.date},${sale.total},${sale.orderCount},${sale.avgTicket}\n`;
      });
    } else {
      csvContent += `Nenhum dado de vendas encontrado\n`;
    }
    csvContent += `\n`;
    
    // ===================== PEDIDOS DETALHADOS =====================
    csvContent += `=== PEDIDOS (ÚLTIMOS 100) ===\n`;
    csvContent += `ID,Cliente,Data,Status,Status Pagamento,Total (R$),Mesa,Observações\n`;
    
    if (reportData.orders && reportData.orders.length > 0) {
      reportData.orders.forEach((order: any) => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR');
        csvContent += `${order.id},${order.customerName || 'N/A'},${formattedDate},${order.status},${order.paymentStatus},${order.total},${order.table || 'N/A'},"${order.notes || ''}"\n`;
      });
    } else {
      csvContent += `Nenhum pedido encontrado\n`;
    }
    csvContent += `\n`;
    
    // ===================== PRODUTOS MAIS VENDIDOS =====================
    csvContent += `=== TOP 20 PRODUTOS MAIS VENDIDOS ===\n`;
    csvContent += `Produto,Categoria,Quantidade Vendida,Receita Total (R$),Preço Unitário (R$)\n`;
    
    if (reportData.topProducts && reportData.topProducts.length > 0) {
      reportData.topProducts.forEach((product: any) => {
        csvContent += `${product.name},${product.categoryName || 'Sem categoria'},${product.totalSold},${product.totalRevenue},${product.price}\n`;
      });
    } else {
      csvContent += `Nenhum produto vendido encontrado\n`;
    }
    csvContent += `\n`;
    
    // ===================== INVENTÁRIO COMPLETO =====================
    csvContent += `=== INVENTÁRIO COMPLETO ===\n`;
    csvContent += `ID,Nome,Categoria,Preço (R$),Custo (R$),Estoque Atual,Estoque Mínimo,Status,Margem (%)\n`;
    
    if (reportData.products && reportData.products.length > 0) {
      reportData.products.forEach((product: any) => {
        const margin = product.cost ? (((product.price - product.cost) / product.price) * 100).toFixed(2) : 'N/A';
        csvContent += `${product.id},${product.name},${product.categoryName || 'Sem categoria'},${product.price},${product.cost || 'N/A'},${product.stock},${product.minStock},${product.isActive ? 'Ativo' : 'Inativo'},${margin}%\n`;
      });
    } else {
      csvContent += `Nenhum produto encontrado\n`;
    }
    csvContent += `\n`;
    
    // ===================== PRODUTOS EM ESTOQUE BAIXO =====================
    csvContent += `=== PRODUTOS EM ESTOQUE BAIXO ===\n`;
    csvContent += `Nome,Estoque Atual,Estoque Mínimo,Diferença,Status\n`;
    
    if (reportData.lowStock && reportData.lowStock.length > 0) {
      reportData.lowStock.forEach((product: any) => {
        const difference = product.stock - product.minStock;
        csvContent += `${product.name},${product.stock},${product.minStock},${difference},${difference <= 0 ? 'CRÍTICO' : 'BAIXO'}\n`;
      });
    } else {
      csvContent += `Nenhum produto em estoque baixo\n`;
    }
    csvContent += `\n`;
    
    // ===================== LOGS DE AUDITORIA =====================
    csvContent += `=== LOGS DE AUDITORIA (ÚLTIMOS 100) ===\n`;
    csvContent += `Data/Hora,Usuário,Ação,Recurso,ID do Recurso,IP,Detalhes\n`;
    
    if (reportData.auditLogs && reportData.auditLogs.length > 0) {
      reportData.auditLogs.forEach((log: any) => {
        const formattedDate = new Date(log.createdAt).toLocaleDateString('pt-BR');
        const formattedTime = new Date(log.createdAt).toLocaleTimeString('pt-BR');
        const details = JSON.stringify(log.details || {}).replace(/"/g, '""');
        csvContent += `${formattedDate} ${formattedTime},${log.userName || 'Sistema'},${log.action},${log.resource},${log.resourceId || 'N/A'},${log.ipAddress || 'N/A'},"${details}"\n`;
      });
    } else {
      csvContent += `Nenhum log de auditoria encontrado\n`;
    }
    csvContent += `\n`;
    
    // Rodapé do relatório
    csvContent += `=== FIM DO RELATÓRIO ===\n`;
    csvContent += `Gerado por: GodoySys - Sistema de Gerenciamento\n`;
    csvContent += `Versão: 1.0.0\n`;
    
    return csvContent;
    
  } catch (error) {
    console.error('Erro ao gerar relatórios CSV:', error);
    throw new Error('Falha na geração dos relatórios');
  }
}

// Função para coletar todos os dados necessários para o relatório
async function gatherReportData(companyId: string): Promise<ReportData> {
  const [
    metrics,
    orders,
    products,
    topProducts,
    lowStock,
    auditLogs,
    sales
  ] = await Promise.all([
    storage.getDashboardMetrics(companyId),
    storage.getOrdersByCompany({ companyId, limit: 100 }),
    storage.getProductsByCompany(companyId),
    storage.getTopProducts(companyId, 20),
    storage.getLowStockProducts(companyId),
    storage.getAuditLogs(companyId, 100),
    storage.getSalesHistory(companyId, 30) // Últimos 30 dias
  ]);

  return {
    metrics,
    orders,
    products,
    topProducts,
    lowStock,
    auditLogs,
    sales
  };
}

// Função para gerar relatório específico de vendas
export async function generateSalesReport(companyId: string, startDate: Date, endDate: Date): Promise<string> {
  try {
    const salesData = await storage.getSalesReportData(companyId, startDate, endDate);
    
    let csvContent = "";
    csvContent += `RELATÓRIO DE VENDAS - PERÍODO ESPECÍFICO\n`;
    csvContent += `Empresa ID: ${companyId}\n`;
    csvContent += `Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}\n`;
    csvContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n`;
    csvContent += `\n`;
    
    csvContent += `Data,Vendas (R$),Número de Pedidos,Ticket Médio (R$),Método de Pagamento Mais Usado\n`;
    
    if (salesData && salesData.length > 0) {
      salesData.forEach((day: any) => {
        csvContent += `${day.date},${day.total},${day.orderCount},${day.avgTicket},${day.topPaymentMethod}\n`;
      });
    } else {
      csvContent += `Nenhum dado encontrado para o período selecionado\n`;
    }
    
    return csvContent;
    
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    throw new Error('Falha na geração do relatório de vendas');
  }
}

// Função para gerar relatório de produtos
export async function generateProductsReport(companyId: string): Promise<string> {
  try {
    const products = await storage.getProductsWithSalesData(companyId);
    
    let csvContent = "";
    csvContent += `RELATÓRIO DETALHADO DE PRODUTOS\n`;
    csvContent += `Empresa ID: ${companyId}\n`;
    csvContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}\n`;
    csvContent += `\n`;
    
    csvContent += `Nome,Categoria,Preço (R$),Custo (R$),Margem (%),Estoque,Vendas (30d),Receita (30d),Status\n`;
    
    if (products && products.length > 0) {
      products.forEach((product: any) => {
        const margin = product.cost ? (((product.price - product.cost) / product.price) * 100).toFixed(2) : 'N/A';
        csvContent += `${product.name},${product.categoryName || 'Sem categoria'},${product.price},${product.cost || 'N/A'},${margin}%,${product.stock},${product.salesCount || 0},${product.salesRevenue || 'R$ 0,00'},${product.isActive ? 'Ativo' : 'Inativo'}\n`;
      });
    } else {
      csvContent += `Nenhum produto encontrado\n`;
    }
    
    return csvContent;
    
  } catch (error) {
    console.error('Erro ao gerar relatório de produtos:', error);
    throw new Error('Falha na geração do relatório de produtos');
  }
}
