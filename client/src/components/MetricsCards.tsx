import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Clock, AlertTriangle, DollarSign, Receipt } from "lucide-react";

interface Metric {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

interface MetricsCardsProps {
  metrics: {
    todaySales: string;
    todayOrders: number;
    salesGrowth: string;
    avgTicket: string;
    pendingOrders: number;
    lowStockCount: number;
    avgWaitTime: string;
  };
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards: Metric[] = [
    {
      title: "Vendas Hoje",
      value: metrics.todaySales,
      change: metrics.salesGrowth,
      changeType: metrics.salesGrowth.includes('+') ? 'positive' : 'negative',
      subtitle: `${metrics.todayOrders} pedidos`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'green',
    },
    {
      title: "Pedidos Pendentes",
      value: metrics.pendingOrders.toString(),
      subtitle: `Tempo médio: ${metrics.avgWaitTime}`,
      icon: <Clock className="h-5 w-5" />,
      color: 'yellow',
    },
    {
      title: "Ticket Médio",
      value: metrics.avgTicket,
      change: metrics.salesGrowth,
      changeType: metrics.salesGrowth.includes('+') ? 'positive' : 'negative',
      subtitle: "vs semana",
      icon: <Receipt className="h-5 w-5" />,
      color: 'blue',
    },
    {
      title: "Estoque Baixo",
      value: `${metrics.lowStockCount} itens`,
      subtitle: "Requer atenção",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-600',
          iconBg: 'bg-green-100',
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
        };
      default:
        return {
          bg: 'bg-gray-50',
          icon: 'text-gray-600',
          iconBg: 'bg-gray-100',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {cards.map((card, index) => {
        const colors = getColorClasses(card.color);
        
        return (
          <Card key={index} className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                    <div className={colors.icon}>
                      {card.icon}
                    </div>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
              
              {(card.change || card.subtitle) && (
                <div className="mt-3">
                  {card.change && (
                    <div className={`flex items-center text-sm ${
                      card.changeType === 'positive' 
                        ? 'text-green-600' 
                        : card.changeType === 'negative' 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                    }`}>
                      {card.changeType === 'positive' && <TrendingUp className="mr-1 h-3 w-3" />}
                      {card.changeType === 'negative' && <TrendingDown className="mr-1 h-3 w-3" />}
                      <span>{card.change}</span>
                      {card.subtitle && <span className="text-gray-500 ml-1">{card.subtitle}</span>}
                    </div>
                  )}
                  
                  {!card.change && card.subtitle && (
                    <div className="text-sm text-gray-500">
                      {card.subtitle}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
