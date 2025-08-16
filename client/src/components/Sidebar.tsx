import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  ShoppingCart, 
  ClipboardList, 
  ChefHat, 
  MessageSquare, 
  Package, 
  FileText, 
  Settings,
  LogOut,
  Store
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useOrdersStore } from "@/store/orders";

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3, roles: ['admin', 'manager', 'attendant', 'kitchen'] },
  { name: 'PDV', href: '/pdv', icon: ShoppingCart, roles: ['admin', 'manager', 'attendant'] },
  { name: 'Pedidos', href: '/orders', icon: ClipboardList, roles: ['admin', 'manager', 'attendant', 'kitchen'] },
  { name: 'Cozinha', href: '/kitchen', icon: ChefHat, roles: ['admin', 'manager', 'kitchen'] },
  { name: 'Chat', href: '/chat', icon: MessageSquare, roles: ['admin', 'manager', 'attendant', 'kitchen'] },
  { name: 'Produtos', href: '/products', icon: Package, roles: ['admin', 'manager'] },
  { name: 'Relatórios', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
  { name: 'Configurações', href: '/config', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCounts } = useChatStore();
  const { orders } = useOrdersStore();

  // Filtrar navegação baseada no role do usuário
  const allowedNavigation = navigation.filter(item => 
    user && item.roles.includes(user.role)
  );

  // Calcular pedidos pendentes
  const pendingOrdersCount = orders.filter(order => 
    order.status === 'pending' || order.status === 'preparing'
  ).length;

  // Total de mensagens não lidas
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="flex flex-col w-64">
      <div className="flex flex-col h-0 flex-1" style={{ backgroundColor: '#1F2937' }}>
        {/* Logo e empresa */}
        <div className="flex items-center h-16 flex-shrink-0 px-4" style={{ backgroundColor: '#111827' }}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-white">Restaurante Demo</p>
              <p className="text-xs text-gray-300 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Menu de navegação */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {allowedNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
              
              // Badges para alguns itens
              let badge = null;
              if (item.name === 'Pedidos' && pendingOrdersCount > 0) {
                badge = pendingOrdersCount;
              } else if (item.name === 'Chat' && totalUnread > 0) {
                badge = totalUnread > 9 ? '9+' : totalUnread;
              }

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-sm font-medium h-10",
                      isActive
                        ? "bg-gray-700 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    )}
                  >
                    <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {item.name}
                    {badge && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs bg-blue-600 text-white rounded-full">
                        {badge}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Usuário e logout */}
        <div className="flex-shrink-0 flex bg-gray-700 p-4">
          <div className="flex items-center w-full">
            <div>
              <div className="inline-block h-9 w-9 bg-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-gray-300">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 flex-shrink-0 text-gray-400 hover:text-white"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
