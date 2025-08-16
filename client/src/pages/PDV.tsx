/**
 * GodoySys - Ponto de Venda (PDV)
 * 
 * Esta página implementa o sistema de PDV para criação rápida
 * de pedidos com interface intuitiva e cálculos automáticos.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Phone, 
  MapPin,
  DollarSign,
  Calculator,
  Check,
  Search,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { api } from '@/services/api';
import { useCurrency } from '@/store/useCompanyStore';
import { useOrderStore } from '@/store/useOrderStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Interface para produtos
interface Product {
  id: string;
  name: string;
  description?: string;
  price: string;
  stock: number;
  isActive: boolean;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function PDV() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  
  const {
    cart,
    customer,
    discount,
    notes,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    setCustomer,
    setDiscount,
    setNotes,
    getCartTotal,
    getCartSubtotal,
    getCartItemCount,
    createOrder,
  } = useOrderStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Carregar produtos e categorias
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Carregando produtos para PDV...');

      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products', { active: true }),
        api.get('/products/categories'),
      ]);

      setProducts(productsResponse.data.products);
      setCategories(categoriesResponse.data.categories);

      console.log(`✅ ${productsResponse.data.products.length} produtos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory && product.stock > 0;
  });

  // Adicionar produto ao carrinho
  const handleAddProduct = (product: Product) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
    });
    
    toast({
      title: 'Produto adicionado',
      description: `${product.name} foi adicionado ao carrinho`,
    });
  };

  // Atualizar quantidade no carrinho
  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateCartItem(productId, { quantity: newQuantity });
    }
  };

  // Finalizar pedido
  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao carrinho antes de finalizar',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreatingOrder(true);
      console.log('🧾 Criando pedido...', { 
        items: cart.length, 
        total: getCartTotal() 
      });

      // Preparar dados do pedido
      const orderData = {
        customerName: customer.name || undefined,
        customerPhone: customer.phone || undefined,
        table: customer.table || undefined,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
        discount: discount,
        notes: notes || undefined,
      };

      const orderId = await createOrder(orderData);

      if (orderId) {
        toast({
          title: 'Pedido criado com sucesso!',
          description: `Pedido #${orderId.slice(0, 8)} foi criado`,
        });

        // Limpar carrinho e redirecionar
        clearCart();
        setLocation(`/orders`);
      } else {
        throw new Error('Falha ao criar pedido');
      }

    } catch (error: any) {
      console.error('❌ Erro ao criar pedido:', error);
      
      let errorMessage = 'Erro ao criar pedido';
      if (error?.message?.includes('estoque')) {
        errorMessage = 'Estoque insuficiente para alguns itens';
      }
      
      toast({
        title: 'Erro ao finalizar pedido',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  const subtotal = getCartSubtotal();
  const total = getCartTotal();
  const itemCount = getCartItemCount();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PDV - Ponto de Venda</h1>
          <p className="text-gray-600">Crie pedidos de forma rápida e intuitiva</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-700 border-green-200">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Produtos */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar Produtos</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Nome ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="w-full sm:w-48">
                  <Label>Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de produtos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <p className="text-gray-500">Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      <Badge variant={product.stock > product.stock * 0.2 ? 'default' : 'destructive'}>
                        {product.stock} un.
                      </Badge>
                    </div>
                    
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(parseFloat(product.price))}
                      </span>
                      <Button 
                        onClick={() => handleAddProduct(product)}
                        size="sm"
                        disabled={product.stock === 0}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Carrinho e checkout */}
        <div className="space-y-6">
          
          {/* Dados do cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Nome</Label>
                <Input
                  id="customerName"
                  placeholder="Nome do cliente"
                  value={customer.name}
                  onChange={(e) => setCustomer({ name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="customerPhone">Telefone</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="customerPhone"
                    placeholder="(11) 99999-9999"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ phone: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="table">Mesa</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="table"
                    placeholder="Mesa 1"
                    value={customer.table}
                    onChange={(e) => setCustomer({ table: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carrinho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrinho ({itemCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        
                        <span className="w-8 text-center">{item.quantity}</span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desconto e observações */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Ajustes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={subtotal}
                      placeholder="0,00"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observações do pedido..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total e finalizar */}
          {cart.length > 0 && (
            <Card className="border-primary">
              <CardContent className="pt-6">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Desconto:</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={clearCart}
                    className="flex-1"
                    disabled={isCreatingOrder}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                  
                  <Button 
                    onClick={handleFinishOrder}
                    disabled={isCreatingOrder}
                    className="flex-1"
                  >
                    {isCreatingOrder ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Processando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Finalizar
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
