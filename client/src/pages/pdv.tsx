import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Banknote,
  Search 
} from "lucide-react";
import { useOrdersStore } from "@/store/orders";
import { useToast } from "@/hooks/use-toast";

export default function PDV() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  const {
    products,
    currentOrder,
    currentOrderItems,
    fetchProducts,
    startNewOrder,
    addItemToOrder,
    removeItemFromOrder,
    updateOrderItem,
    setOrderCustomer,
    calculateOrderTotal,
    createOrder,
    clearError,
    error
  } = useOrdersStore();

  const { toast } = useToast();

  // Inicializar PDV
  useEffect(() => {
    fetchProducts();
    startNewOrder();
  }, [fetchProducts, startNewOrder]);

  // Mostrar erros como toast
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error,
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  // Obter categorias únicas
  const categories = Array.from(new Set(products.map(p => p.categoryName).filter(Boolean)));

  // Calcular totais
  const totals = calculateOrderTotal();

  const handleAddToOrder = (product: any) => {
    addItemToOrder(product, 1);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItemFromOrder(itemId);
    } else {
      const item = currentOrderItems.find(i => i.id === itemId);
      updateOrderItem(itemId, newQuantity, item?.notes);
    }
  };

  const handleFinishOrder = async () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Adicione pelo menos um item ao pedido",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um método de pagamento",
      });
      return;
    }

    const orderData = {
      ...currentOrder,
      paymentMethod,
      paymentStatus: paymentMethod === 'dinheiro' ? 'paid' : 'pending',
    };

    const success = await createOrder(orderData);
    
    if (success) {
      toast({
        title: "Sucesso",
        description: "Pedido criado com sucesso!",
      });
      
      // Reiniciar para novo pedido
      startNewOrder();
      setPaymentMethod('');
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista de Produtos */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Produtos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex space-x-4 mb-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Buscar produto</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="search"
                        placeholder="Nome ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grid de produtos */}
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <p className="text-gray-500">Nenhum produto encontrado</p>
                      </div>
                    ) : (
                      filteredProducts.map(product => (
                        <Card 
                          key={product.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleAddToOrder(product)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                            {product.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-green-600">
                                R$ {parseFloat(product.price).toFixed(2)}
                              </span>
                              {product.stock <= product.minStock && (
                                <Badge variant="destructive" className="text-xs">
                                  Baixo
                                </Badge>
                              )}
                            </div>
                            {product.categoryName && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {product.categoryName}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Carrinho e Finalização */}
          <div className="space-y-4">
            {/* Informações do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Nome do Cliente</Label>
                  <Input
                    id="customerName"
                    placeholder="Nome (opcional)"
                    value={currentOrder?.customerName || ''}
                    onChange={(e) => setOrderCustomer({ customerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="table">Mesa/Local</Label>
                  <Input
                    id="table"
                    placeholder="Mesa 1, Balcão, etc."
                    value={currentOrder?.table || ''}
                    onChange={(e) => setOrderCustomer({ table: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observações especiais..."
                    value={currentOrder?.notes || ''}
                    onChange={(e) => setOrderCustomer({ notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Carrinho */}
            <Card>
              <CardHeader>
                <CardTitle>Carrinho ({currentOrderItems.length} itens)</CardTitle>
              </CardHeader>
              <CardContent>
                {currentOrderItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    Carrinho vazio
                  </p>
                ) : (
                  <ScrollArea className="max-h-60">
                    <div className="space-y-3">
                      {currentOrderItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium">{item.productName}</h4>
                            <p className="text-xs text-gray-500">
                              R$ {parseFloat(item.price).toFixed(2)} cada
                            </p>
                            {item.notes && (
                              <p className="text-xs text-gray-600 italic">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => removeItemFromOrder(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right ml-2">
                            <span className="text-sm font-medium">
                              R$ {parseFloat(item.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Totais e Pagamento */}
            {currentOrderItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Finalizar Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Totais */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R$ {totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de serviço (10%):</span>
                      <span>R$ {totals.tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>R$ {totals.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Método de pagamento */}
                  <div>
                    <Label>Método de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">
                          <div className="flex items-center">
                            <Banknote className="h-4 w-4 mr-2" />
                            Dinheiro
                          </div>
                        </SelectItem>
                        <SelectItem value="cartao">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Cartão
                          </div>
                        </SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botões de ação */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleFinishOrder}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                      disabled={currentOrderItems.length === 0 || !paymentMethod}
                    >
                      Finalizar Pedido
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={startNewOrder}
                    >
                      Novo Pedido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
