import { create } from 'zustand';
import { apiRequest } from '@/services/api';

// Tipos para pedidos
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: string;
  total: string;
  notes?: string;
}

interface Order {
  id: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  table?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'cancelled';
  paymentMethod?: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes?: string;
  estimatedTime?: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  categoryId?: string;
  categoryName?: string;
  isActive: boolean;
}

interface OrdersState {
  orders: Order[];
  products: Product[];
  currentOrder: Partial<Order> | null;
  currentOrderItems: OrderItem[];
  isLoading: boolean;
  error: string | null;
}

interface OrdersActions {
  fetchOrders: (filters?: { status?: string; date?: string }) => Promise<void>;
  fetchProducts: () => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>;
  
  // Gestão do pedido atual (PDV)
  startNewOrder: () => void;
  addItemToOrder: (product: Product, quantity: number, notes?: string) => void;
  removeItemFromOrder: (itemId: string) => void;
  updateOrderItem: (itemId: string, quantity: number, notes?: string) => void;
  setOrderCustomer: (customerData: { name?: string; phone?: string; email?: string; table?: string }) => void;
  calculateOrderTotal: () => { subtotal: number; tax: number; total: number };
  
  clearError: () => void;
}

export const useOrdersStore = create<OrdersState & OrdersActions>((set, get) => ({
  // Estado inicial
  orders: [],
  products: [],
  currentOrder: null,
  currentOrderItems: [],
  isLoading: false,
  error: null,

  // Ações para buscar dados
  fetchOrders: async (filters = {}) => {
    set({ isLoading: true, error: null });
    
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.date) queryParams.append('date', filters.date);
      
      const response = await apiRequest('GET', `/api/orders?${queryParams}`);
      const orders = await response.json();
      
      set({ orders, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar pedidos';
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchProducts: async () => {
    try {
      const response = await apiRequest('GET', '/api/products');
      const products = await response.json();
      
      set({ products });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar produtos';
      set({ error: errorMessage });
    }
  },

  createOrder: async (orderData) => {
    const { currentOrderItems } = get();
    
    if (currentOrderItems.length === 0) {
      set({ error: 'Pedido deve ter pelo menos um item' });
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const totals = get().calculateOrderTotal();
      
      const completeOrderData = {
        ...orderData,
        subtotal: totals.subtotal.toFixed(2),
        tax: totals.tax.toFixed(2),
        total: totals.total.toFixed(2),
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        items: currentOrderItems,
      };
      
      const response = await apiRequest('POST', '/api/orders', completeOrderData);
      const newOrder = await response.json();
      
      set(state => ({
        orders: [newOrder, ...state.orders],
        currentOrder: null,
        currentOrderItems: [],
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar pedido';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
      const updatedOrder = await response.json();
      
      set(state => ({
        orders: state.orders.map(order => 
          order.id === orderId ? updatedOrder : order
        ),
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar pedido';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  // Gestão do pedido atual
  startNewOrder: () => {
    set({
      currentOrder: {
        customerName: '',
        table: '',
        notes: '',
      },
      currentOrderItems: [],
    });
  },

  addItemToOrder: (product, quantity, notes) => {
    const itemId = `${product.id}_${Date.now()}`;
    const price = parseFloat(product.price);
    const total = price * quantity;
    
    const newItem: OrderItem = {
      id: itemId,
      productId: product.id,
      productName: product.name,
      quantity,
      price: price.toFixed(2),
      total: total.toFixed(2),
      notes,
    };
    
    set(state => ({
      currentOrderItems: [...state.currentOrderItems, newItem],
    }));
  },

  removeItemFromOrder: (itemId) => {
    set(state => ({
      currentOrderItems: state.currentOrderItems.filter(item => item.id !== itemId),
    }));
  },

  updateOrderItem: (itemId, quantity, notes) => {
    set(state => ({
      currentOrderItems: state.currentOrderItems.map(item => {
        if (item.id === itemId) {
          const price = parseFloat(item.price);
          const total = price * quantity;
          
          return {
            ...item,
            quantity,
            total: total.toFixed(2),
            notes,
          };
        }
        return item;
      }),
    }));
  },

  setOrderCustomer: (customerData) => {
    set(state => ({
      currentOrder: {
        ...state.currentOrder,
        ...customerData,
      },
    }));
  },

  calculateOrderTotal: () => {
    const { currentOrderItems } = get();
    
    const subtotal = currentOrderItems.reduce((sum, item) => {
      return sum + parseFloat(item.total);
    }, 0);
    
    const tax = subtotal * 0.1; // 10% de taxa
    const total = subtotal + tax;
    
    return {
      subtotal,
      tax,
      total,
    };
  },

  clearError: () => {
    set({ error: null });
  },
}));
