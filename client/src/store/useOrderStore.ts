/**
 * GodoySys - Store de Pedidos
 * 
 * Este store gerencia o estado dos pedidos, carrinho do PDV
 * e operações relacionadas usando Zustand.
 */

import { create } from 'zustand';
import { api } from '@/services/api';

// Tipos para pedidos
interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  customerName?: string;
  customerPhone?: string;
  table?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: string;
  discount: string;
  total: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para o carrinho do PDV
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface OrderFilters {
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  userId?: string;
}

interface OrderState {
  // Estado dos pedidos
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  filters: OrderFilters;
  
  // Estado do carrinho PDV
  cart: CartItem[];
  customer: {
    name: string;
    phone: string;
    table: string;
  };
  discount: number;
  notes: string;
  
  // Ações de pedidos
  fetchOrders: (filters?: OrderFilters) => Promise<void>;
  fetchOrder: (id: string) => Promise<Order | null>;
  createOrder: (orderData: any) => Promise<string | null>;
  updateOrderStatus: (id: string, status: string, notes?: string) => Promise<boolean>;
  
  // Ações do carrinho
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  
  // Ações de cliente
  setCustomer: (customer: Partial<OrderState['customer']>) => void;
  setDiscount: (discount: number) => void;
  setNotes: (notes: string) => void;
  
  // Utilitários
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getCartItemCount: () => number;
  
  // Filtros
  setFilters: (filters: Partial<OrderFilters>) => void;
  clearFilters: () => void;
}

/**
 * Store de pedidos usando Zustand
 */
export const useOrderStore = create<OrderState>((set, get) => ({
  // Estado inicial
  orders: [],
  currentOrder: null,
  isLoading: false,
  filters: {},
  
  // Estado do carrinho
  cart: [],
  customer: {
    name: '',
    phone: '',
    table: '',
  },
  discount: 0,
  notes: '',

  /**
   * Busca lista de pedidos
   */
  fetchOrders: async (filters = {}) => {
    set({ isLoading: true });
    
    try {
      console.log('🧾 Buscando pedidos...', filters);
      
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.dateStart) params.append('dateStart', filters.dateStart);
      if (filters.dateEnd) params.append('dateEnd', filters.dateEnd);
      if (filters.userId) params.append('userId', filters.userId);
      
      const queryString = params.toString();
      const response = await api.get(`/orders${queryString ? `?${queryString}` : ''}`);
      
      const { orders } = response.data;

      set({
        orders,
        filters,
        isLoading: false,
      });

      console.log(`✅ ${orders.length} pedidos carregados`);

    } catch (error) {
      console.error('❌ Erro ao buscar pedidos:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Busca um pedido específico
   */
  fetchOrder: async (id: string) => {
    try {
      console.log('🧾 Buscando pedido:', id);
      
      const response = await api.get(`/orders/${id}`);
      const { order } = response.data;

      set({ currentOrder: order });

      console.log('✅ Pedido carregado:', order.id);
      return order;

    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      return null;
    }
  },

  /**
   * Cria um novo pedido
   */
  createOrder: async (orderData: any) => {
    try {
      console.log('🧾 Criando pedido...', orderData);
      
      const response = await api.post('/orders', orderData);
      const { order } = response.data;

      // Adicionar novo pedido à lista
      set(state => ({
        orders: [order, ...state.orders],
      }));

      console.log('✅ Pedido criado:', order.id);
      return order.id;

    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      return null;
    }
  },

  /**
   * Atualiza status de um pedido
   */
  updateOrderStatus: async (id: string, status: string, notes?: string) => {
    try {
      console.log('🔄 Atualizando status do pedido:', { id, status, notes });
      
      const response = await api.put(`/orders/${id}/status`, {
        status,
        notes,
      });
      
      const { order } = response.data;

      // Atualizar pedido na lista
      set(state => ({
        orders: state.orders.map(o => o.id === id ? order : o),
        currentOrder: state.currentOrder?.id === id ? order : state.currentOrder,
      }));

      console.log('✅ Status atualizado:', order.status);
      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return false;
    }
  },

  /**
   * Adiciona item ao carrinho
   */
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    set(state => {
      const existingItem = state.cart.find(cartItem => cartItem.productId === item.productId);
      
      if (existingItem) {
        // Se item já existe, aumentar quantidade
        return {
          cart: state.cart.map(cartItem =>
            cartItem.productId === item.productId
              ? { ...cartItem, quantity: cartItem.quantity + quantity }
              : cartItem
          ),
        };
      } else {
        // Adicionar novo item
        return {
          cart: [...state.cart, { ...item, quantity }],
        };
      }
    });

    console.log('🛒 Item adicionado ao carrinho:', item.name);
  },

  /**
   * Remove item do carrinho
   */
  removeFromCart: (productId: string) => {
    set(state => ({
      cart: state.cart.filter(item => item.productId !== productId),
    }));

    console.log('🛒 Item removido do carrinho:', productId);
  },

  /**
   * Atualiza item do carrinho
   */
  updateCartItem: (productId: string, updates: Partial<CartItem>) => {
    set(state => ({
      cart: state.cart.map(item =>
        item.productId === productId
          ? { ...item, ...updates }
          : item
      ),
    }));
  },

  /**
   * Limpa o carrinho
   */
  clearCart: () => {
    set({
      cart: [],
      customer: { name: '', phone: '', table: '' },
      discount: 0,
      notes: '',
    });

    console.log('🛒 Carrinho limpo');
  },

  /**
   * Define dados do cliente
   */
  setCustomer: (customer: Partial<OrderState['customer']>) => {
    set(state => ({
      customer: { ...state.customer, ...customer },
    }));
  },

  /**
   * Define desconto
   */
  setDiscount: (discount: number) => {
    set({ discount: Math.max(0, discount) });
  },

  /**
   * Define observações
   */
  setNotes: (notes: string) => {
    set({ notes });
  },

  /**
   * Calcula total do carrinho (com desconto)
   */
  getCartTotal: () => {
    const { cart, discount } = get();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return Math.max(0, subtotal - discount);
  },

  /**
   * Calcula subtotal do carrinho (sem desconto)
   */
  getCartSubtotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  /**
   * Conta total de itens no carrinho
   */
  getCartItemCount: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  /**
   * Define filtros de busca
   */
  setFilters: (filters: Partial<OrderFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  /**
   * Limpa filtros de busca
   */
  clearFilters: () => {
    set({ filters: {} });
  },
}));

/**
 * Hook para estatísticas de pedidos
 */
export function useOrderStats() {
  const { orders } = useOrderStore();

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalSales: orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + parseFloat(order.total), 0),
  };

  return stats;
}

/**
 * Hook para pedidos por status
 */
export function useOrdersByStatus() {
  const { orders } = useOrderStore();

  return {
    pending: orders.filter(o => o.status === 'pending'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready: orders.filter(o => o.status === 'ready'),
    delivered: orders.filter(o => o.status === 'delivered'),
    cancelled: orders.filter(o => o.status === 'cancelled'),
  };
}
