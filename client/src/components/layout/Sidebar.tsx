/**
 * GodoySys - Componente Sidebar
 * 
 * Navegação lateral principal da aplicação com menu responsivo
 * e indicadores de estado em tempo real.
 */

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Store,
  BarChart3,
  ShoppingCart,
  Package,
  ChefHat,
  MessageCircle,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Clock,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useUser, usePermissions } from '@/store/useAuthStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatNotifications } from '@/store/useChatStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useCompanyStore } from '@/store/useCompanyStore';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  requiresPermission?: string[];
}

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const { user, company, userInitials } = useUser();
  const { 
    isAdmin, 
    isManager, 
    canViewReports, 
    canAccessKitchen,
    canManageProducts 
  } = usePermissions();
  const { logout } = useAuthStore();
  const { hasUnread, totalUnread } = useChatNotifications();
  const { orders } = useOrderStore();

  // Contar pedidos pendentes
  const pendingOrders = orders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
  ).length;

  // Menu items com permissões
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      href: '/dashboard',
    },
    {
      id: 'pdv',
      label: 'PDV / Vendas',
      icon: ShoppingCart,
      href: '/pdv',
      badge: 'Ativo',
      badgeVariant: 'outline',
    },
    {
      id: 'orders',
      label: 'Pedidos',
      icon: FileText,
      href: '/orders',
      badge: pendingOrders > 0 ? pendingOrders : undefined,
      badgeVariant: 'destructive',
    },
    {
      id: 'kitchen',
      label: 'Cozinha',
      icon: ChefHat,
      href: '/kitchen',
      requiresPermission: ['kitchen'],
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: Package,
      href: '/products',
      requiresPermission: ['products'],
    },
    {
      id: 'chat',
      label: 'Chat Interno',
      icon: MessageCircle,
      href: '/chat',
      badge: hasUnread ? totalUnread : undefined,
      badgeVariant: 'default',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: FileText,
      href: '/reports',
      requiresPermission: ['reports'],
    },
    {
      id: 'config',
      label: 'Configurações',
      icon: Settings,
      href: '/config',
      requiresPermission: ['admin'],
    },
  ];

  // Filtrar itens baseado em permissões
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.requiresPermission) return true;
    
    return item.requiresPermission.some(permission => {
      switch (permission) {
        case 'kitchen': return canAccessKitchen;
        case 'products': return canManageProducts;
        case 'reports': return canViewReports;
        case 'admin': return isAdmin || isManager;
        default: return false;
      }
    });
  });

  const handleLogout = async () => {
    await logout();
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location.startsWith(href);
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobile}
          className="bg-white shadow-lg"
        >
          {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          
          {/* Header com logo e empresa */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200 bg-primary text-primary-foreground">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-foreground rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold truncate">
                  {company?.name || 'GodoySys'}
                </h1>
                <p className="text-xs text-primary-foreground/80">
                  Multi-tenant
                </p>
              </div>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {visibleMenuItems.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? 'default' : 'ghost'}
                        className={`w-full justify-start h-11 ${
                          isActive 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => setIsMobileOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.badgeVariant || 'default'} 
                            className="ml-2 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          {/* Status e notificações */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">Sistema Online</span>
              </div>
              
              {(hasUnread || pendingOrders > 0) && (
                <div className="flex items-center space-x-2">
                  {hasUnread && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center space-x-1 text-blue-600">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">{totalUnread}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{totalUnread} mensagens não lidas</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {pendingOrders > 0 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center space-x-1 text-orange-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">{pendingOrders}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{pendingOrders} pedidos pendentes</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Usuário e logout */}
          <div className="flex items-center p-4 border-t border-gray-200">
            <Avatar className="w-10 h-10">
              <AvatarImage src="" alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'admin' && 'Administrador'}
                {user?.role === 'manager' && 'Gerente'}
                {user?.role === 'attendant' && 'Atendente'}
                {user?.role === 'kitchen' && 'Cozinha'}
              </p>
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fazer logout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
}
