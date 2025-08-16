/**
 * GodoySys - Página de Produtos
 * 
 * Esta página gerencia CRUD de produtos, categorias,
 * controle de estoque e importação via CSV.
 */

import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  Tag,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

import { api } from '@/services/api';
import { useCurrency } from '@/store/useCompanyStore';
import { usePermissions } from '@/store/useAuthStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Tipos para produtos e categorias
interface Product {
  id: string;
  name: string;
  description?: string;
  price: string;
  cost?: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  categoryId?: string;
  category?: Category;
  attributes: any;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  attributes: any;
  createdAt: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  cost: string;
  stock: number;
  minStock: number;
  categoryId: string;
  isActive: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
}

export default function Products() {
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { canManageProducts } = usePermissions();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  
  // Modais
  const [productModal, setProductModal] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    product: null as Product | null,
  });
  
  const [categoryModal, setCategoryModal] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    category: null as Category | null,
  });
  
  const [importModal, setImportModal] = useState(false);
  
  // Formulários
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    cost: '',
    stock: 0,
    minStock: 5,
    categoryId: '',
    isActive: true,
  });
  
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
  });
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar permissões
  if (!canManageProducts) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para gerenciar produtos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('📦 Carregando produtos e categorias...');

      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories'),
      ]);

      setProducts(productsResponse.data.products);
      setCategories(categoriesResponse.data.categories);

      console.log(`✅ ${productsResponse.data.products.length} produtos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar produtos e categorias',
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
    const matchesActive = showInactive || product.isActive;
    
    return matchesSearch && matchesCategory && matchesActive;
  });

  // Abrir modal de produto
  const openProductModal = (mode: 'create' | 'edit', product?: Product) => {
    if (mode === 'edit' && product) {
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: product.price,
        cost: product.cost || '',
        stock: product.stock,
        minStock: product.minStock,
        categoryId: product.categoryId || '',
        isActive: product.isActive,
      });
      setProductModal({ isOpen: true, mode, product });
    } else {
      setProductForm({
        name: '',
        description: '',
        price: '',
        cost: '',
        stock: 0,
        minStock: 5,
        categoryId: '',
        isActive: true,
      });
      setProductModal({ isOpen: true, mode, product: null });
    }
  };

  // Salvar produto
  const handleSaveProduct = async () => {
    try {
      setIsSubmitting(true);
      console.log('💾 Salvando produto...', productForm);

      const productData = {
        ...productForm,
        price: parseFloat(productForm.price).toFixed(2),
        cost: productForm.cost ? parseFloat(productForm.cost).toFixed(2) : undefined,
      };

      if (productModal.mode === 'create') {
        await api.post('/products', productData);
        toast({
          title: 'Produto criado',
          description: 'Produto foi criado com sucesso',
        });
      } else {
        await api.put(`/products/${productModal.product!.id}`, productData);
        toast({
          title: 'Produto atualizado',
          description: 'Produto foi atualizado com sucesso',
        });
      }

      setProductModal({ isOpen: false, mode: 'create', product: null });
      await loadData();

    } catch (error: any) {
      console.error('❌ Erro ao salvar produto:', error);
      toast({
        title: 'Erro ao salvar produto',
        description: error?.message || 'Não foi possível salvar o produto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar produto
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja remover "${product.name}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Removendo produto:', product.id);
      await api.delete(`/products/${product.id}`);

      toast({
        title: 'Produto removido',
        description: 'Produto foi removido com sucesso',
      });

      await loadData();
    } catch (error) {
      console.error('❌ Erro ao remover produto:', error);
      toast({
        title: 'Erro ao remover produto',
        description: 'Não foi possível remover o produto',
        variant: 'destructive',
      });
    }
  };

  // Salvar categoria
  const handleSaveCategory = async () => {
    try {
      setIsSubmitting(true);
      console.log('💾 Salvando categoria...', categoryForm);

      if (categoryModal.mode === 'create') {
        await api.post('/products/categories', categoryForm);
        toast({
          title: 'Categoria criada',
          description: 'Categoria foi criada com sucesso',
        });
      } else {
        await api.put(`/products/categories/${categoryModal.category!.id}`, categoryForm);
        toast({
          title: 'Categoria atualizada',
          description: 'Categoria foi atualizada com sucesso',
        });
      }

      setCategoryModal({ isOpen: false, mode: 'create', category: null });
      await loadData();

    } catch (error: any) {
      console.error('❌ Erro ao salvar categoria:', error);
      toast({
        title: 'Erro ao salvar categoria',
        description: error?.message || 'Não foi possível salvar a categoria',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Importar CSV
  const handleImportCSV = async () => {
    if (!importFile) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione um arquivo CSV para importar',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('📥 Importando produtos via CSV...');

      await api.upload('/products/import-csv', importFile, { csvFile: importFile });

      toast({
        title: 'Importação concluída',
        description: 'Produtos foram importados com sucesso',
      });

      setImportModal(false);
      setImportFile(null);
      await loadData();

    } catch (error: any) {
      console.error('❌ Erro na importação:', error);
      toast({
        title: 'Erro na importação',
        description: error?.message || 'Não foi possível importar os produtos',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600">Gerencie produtos, categorias e estoque</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          
          <Button onClick={() => openProductModal('create')}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>

        {/* Tab de Produtos */}
        <TabsContent value="products" className="space-y-6">
          
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Nome ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
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
                
                <div className="space-y-2">
                  <Label>Exibir</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="showInactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                    <Label htmlFor="showInactive">Incluir inativos</Label>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                      setShowInactive(false);
                    }}
                    className="w-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de produtos */}
          <Card>
            <CardHeader>
              <CardTitle>
                Produtos ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie seu primeiro produto ou ajuste os filtros
                  </p>
                  <Button onClick={() => openProductModal('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Produto
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Sem categoria</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(parseFloat(product.price))}
                          </div>
                          {product.cost && (
                            <div className="text-sm text-muted-foreground">
                              Custo: {formatCurrency(parseFloat(product.cost))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={
                              product.stock <= product.minStock 
                                ? 'text-red-600 font-medium' 
                                : ''
                            }>
                              {product.stock}
                            </span>
                            {product.stock <= product.minStock && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Mín: {product.minStock}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {product.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openProductModal('edit', product)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Categorias */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categorias ({categories.length})</CardTitle>
              <Button 
                onClick={() => {
                  setCategoryForm({ name: '', description: '' });
                  setCategoryModal({ isOpen: true, mode: 'create', category: null });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma categoria criada</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie categorias para organizar seus produtos
                  </p>
                  <Button 
                    onClick={() => {
                      setCategoryForm({ name: '', description: '' });
                      setCategoryModal({ isOpen: true, mode: 'create', category: null });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Categoria
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <Card key={category.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium">{category.name}</h3>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setCategoryForm({
                                name: category.name,
                                description: category.description || '',
                              });
                              setCategoryModal({ 
                                isOpen: true, 
                                mode: 'edit', 
                                category 
                              });
                            }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {category.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {category.description}
                          </p>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          {products.filter(p => p.categoryId === category.id).length} produtos
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Produto */}
      <Dialog 
        open={productModal.isOpen} 
        onOpenChange={(open) => setProductModal(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {productModal.mode === 'create' ? 'Novo Produto' : 'Editar Produto'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do produto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Nome *</Label>
              <Input
                id="productName"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do produto"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="productDescription">Descrição</Label>
              <Textarea
                id="productDescription"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do produto"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productPrice">Preço *</Label>
                <Input
                  id="productPrice"
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productCost">Custo</Label>
                <Input
                  id="productCost"
                  type="number"
                  step="0.01"
                  value={productForm.cost}
                  onChange={(e) => setProductForm(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productStock">Estoque</Label>
                <Input
                  id="productStock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productMinStock">Estoque Mínimo</Label>
                <Input
                  id="productMinStock"
                  type="number"
                  value={productForm.minStock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="productCategory">Categoria</Label>
              <Select 
                value={productForm.categoryId} 
                onValueChange={(value) => setProductForm(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="productActive"
                checked={productForm.isActive}
                onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="productActive">Produto ativo</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setProductModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveProduct}
              disabled={isSubmitting || !productForm.name || !productForm.price}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Salvando...
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Categoria */}
      <Dialog 
        open={categoryModal.isOpen} 
        onOpenChange={(open) => setCategoryModal(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryModal.mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações da categoria
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Nome *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da categoria"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Descrição</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da categoria"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveCategory}
              disabled={isSubmitting || !categoryForm.name}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Salvando...
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação CSV */}
      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Produtos via CSV</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo CSV com os dados dos produtos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="csvFile">Arquivo CSV</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium text-blue-900 mb-2">Formato esperado:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Colunas:</strong> name, description, price, cost, stock, minStock, category</p>
                <p><strong>Exemplo:</strong></p>
                <code className="text-xs">
                  Hambúrguer,Hambúrguer artesanal,25.90,12.50,20,5,Pratos Principais
                </code>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setImportModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportCSV}
              disabled={isSubmitting || !importFile}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Importando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Importar
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
