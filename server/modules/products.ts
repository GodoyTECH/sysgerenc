/**
 * GodoySys - Módulo de Produtos
 * 
 * Este módulo gerencia CRUD de produtos, categorias,
 * controle de estoque e importação de produtos via CSV.
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { insertProductSchema, insertProductCategorySchema } from "@shared/schema";
import type { IStorage } from "../storage";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";

// Configurar multer para upload de arquivos CSV
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Schemas de validação
const updateProductSchema = insertProductSchema.partial().omit({ companyId: true });
const updateCategorySchema = insertProductCategorySchema.partial().omit({ companyId: true });

const csvProductSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço deve ser um número válido"),
  cost: z.string().regex(/^\d+(\.\d{1,2})?$/, "Custo deve ser um número válido").optional(),
  stock: z.string().regex(/^\d+$/, "Estoque deve ser um número inteiro").optional(),
  minStock: z.string().regex(/^\d+$/, "Estoque mínimo deve ser um número inteiro").optional(),
  category: z.string().optional(),
});

/**
 * Configura as rotas de produtos
 */
export function setupProductRoutes(app: Express, storage: IStorage) {
  console.log("📦 Configurando rotas de produtos...");

  // ============ ROTAS DE CATEGORIAS ============

  /**
   * GET /api/products/categories
   * Lista todas as categorias de produtos
   */
  app.get('/api/products/categories', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      
      const categories = await storage.getProductCategories(companyId);
      
      res.json({
        categories,
        total: categories.length,
      });

    } catch (error) {
      console.error("❌ Erro ao listar categorias:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/products/categories
   * Cria uma nova categoria de produto
   */
  app.post('/api/products/categories', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões - apenas admin e manager podem criar categorias
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem criar categorias",
        });
      }

      const categoryData = insertProductCategorySchema.parse({
        ...req.body,
        companyId,
      });

      const newCategory = await storage.createProductCategory(categoryData);

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'create_category',
        resource: 'product_categories',
        resourceId: newCategory.id,
        details: {
          categoryName: newCategory.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Categoria criada: ${newCategory.name}`);

      res.status(201).json({
        message: "Categoria criada com sucesso",
        category: newCategory,
      });

    } catch (error) {
      console.error("❌ Erro ao criar categoria:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/products/categories/:id
   * Atualiza uma categoria existente
   */
  app.put('/api/products/categories/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;
      const { id } = req.params;

      // Verificar permissões
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem alterar categorias",
        });
      }

      const updateData = updateCategorySchema.parse(req.body);

      const updatedCategory = await storage.updateProductCategory(id, companyId, updateData);
      if (!updatedCategory) {
        return res.status(404).json({
          error: "Categoria não encontrada",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_category',
        resource: 'product_categories',
        resourceId: id,
        details: {
          categoryName: updatedCategory.name,
          updatedFields: Object.keys(updateData),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      res.json({
        message: "Categoria atualizada com sucesso",
        category: updatedCategory,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar categoria:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  // ============ ROTAS DE PRODUTOS ============

  /**
   * GET /api/products
   * Lista produtos com filtros opcionais
   */
  app.get('/api/products', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      const { categoryId, active, lowStock } = req.query;

      let filters: any = {};
      if (categoryId) filters.categoryId = categoryId as string;
      if (active !== undefined) filters.active = active === 'true';

      let products;
      if (lowStock === 'true') {
        products = await storage.getProductsByLowStock(companyId);
      } else {
        products = await storage.getProducts(companyId, filters);
      }

      res.json({
        products,
        total: products.length,
        filters,
      });

    } catch (error) {
      console.error("❌ Erro ao listar produtos:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * GET /api/products/:id
   * Busca um produto específico
   */
  app.get('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const { companyId } = (req as any).user;
      const { id } = req.params;

      const product = await storage.getProduct(id, companyId);
      if (!product) {
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      res.json({ product });

    } catch (error) {
      console.error("❌ Erro ao buscar produto:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/products
   * Cria um novo produto
   */
  app.post('/api/products', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem criar produtos",
        });
      }

      const productData = insertProductSchema.parse({
        ...req.body,
        companyId,
      });

      const newProduct = await storage.createProduct(productData);

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'create_product',
        resource: 'products',
        resourceId: newProduct.id,
        details: {
          productName: newProduct.name,
          price: newProduct.price,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Produto criado: ${newProduct.name}`);

      res.status(201).json({
        message: "Produto criado com sucesso",
        product: newProduct,
      });

    } catch (error) {
      console.error("❌ Erro ao criar produto:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/products/:id
   * Atualiza um produto existente
   */
  app.put('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;
      const { id } = req.params;

      // Verificar permissões
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem alterar produtos",
        });
      }

      const updateData = updateProductSchema.parse(req.body);

      const updatedProduct = await storage.updateProduct(id, companyId, updateData);
      if (!updatedProduct) {
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_product',
        resource: 'products',
        resourceId: id,
        details: {
          productName: updatedProduct.name,
          updatedFields: Object.keys(updateData),
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`✅ Produto atualizado: ${updatedProduct.name}`);

      res.json({
        message: "Produto atualizado com sucesso",
        product: updatedProduct,
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar produto:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * DELETE /api/products/:id
   * Remove um produto (soft delete)
   */
  app.delete('/api/products/:id', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;
      const { id } = req.params;

      // Verificar permissões
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem remover produtos",
        });
      }

      const product = await storage.getProduct(id, companyId);
      if (!product) {
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      const success = await storage.deleteProduct(id, companyId);
      if (!success) {
        return res.status(500).json({
          error: "Falha ao remover produto",
        });
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'delete_product',
        resource: 'products',
        resourceId: id,
        details: {
          productName: product.name,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`🗑️ Produto removido: ${product.name}`);

      res.json({
        message: "Produto removido com sucesso",
      });

    } catch (error) {
      console.error("❌ Erro ao remover produto:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * POST /api/products/import-csv
   * Importa produtos via arquivo CSV
   */
  app.post('/api/products/import-csv', upload.single('csvFile'), async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;

      // Verificar permissões
      if (userRole !== 'admin' && userRole !== 'manager') {
        return res.status(403).json({
          error: "Acesso negado: apenas administradores e gerentes podem importar produtos",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Arquivo CSV é obrigatório",
        });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let lineNumber = 0;

      // Processar CSV
      await new Promise<void>((resolve, reject) => {
        const readable = Readable.from(req.file!.buffer);
        
        readable
          .pipe(csv({ separator: ',', headers: true }))
          .on('data', (data) => {
            lineNumber++;
            
            try {
              const validatedData = csvProductSchema.parse(data);
              results.push({
                line: lineNumber,
                data: validatedData,
              });
            } catch (error) {
              if (error instanceof z.ZodError) {
                errors.push(`Linha ${lineNumber}: ${error.errors.map(e => e.message).join(', ')}`);
              }
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (errors.length > 0) {
        return res.status(400).json({
          error: "Erros encontrados no arquivo CSV",
          errors,
          validLines: results.length,
        });
      }

      // Buscar todas as categorias para mapear nomes
      const categories = await storage.getProductCategories(companyId);
      const categoryMap = new Map(categories.map(cat => [cat.name.toLowerCase(), cat.id]));

      // Criar produtos
      const createdProducts = [];
      const importErrors = [];

      for (const { line, data } of results) {
        try {
          let categoryId = null;
          if (data.category) {
            categoryId = categoryMap.get(data.category.toLowerCase()) || null;
          }

          const productData = {
            companyId,
            categoryId,
            name: data.name,
            description: data.description || null,
            price: data.price,
            cost: data.cost || null,
            stock: data.stock ? parseInt(data.stock) : 0,
            minStock: data.minStock ? parseInt(data.minStock) : 5,
            attributes: {},
            isActive: true,
          };

          const product = await storage.createProduct(productData);
          createdProducts.push(product);
          
        } catch (error) {
          importErrors.push(`Linha ${line}: Erro ao criar produto - ${error}`);
        }
      }

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'import_products_csv',
        resource: 'products',
        details: {
          totalLines: lineNumber,
          successfulImports: createdProducts.length,
          errors: importErrors.length,
          fileName: req.file.originalname,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      console.log(`📥 Importação CSV concluída: ${createdProducts.length} produtos criados`);

      res.json({
        message: "Importação concluída",
        summary: {
          totalLines: lineNumber,
          successfulImports: createdProducts.length,
          errors: importErrors.length,
        },
        createdProducts: createdProducts.map(p => ({ id: p.id, name: p.name })),
        importErrors,
      });

    } catch (error) {
      console.error("❌ Erro na importação CSV:", error);
      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  /**
   * PUT /api/products/:id/stock
   * Atualiza apenas o estoque de um produto
   */
  app.put('/api/products/:id/stock', async (req: Request, res: Response) => {
    try {
      const { companyId, role: userRole, userId } = (req as any).user;
      const { id } = req.params;
      
      // Atendentes podem alterar estoque
      if (!['admin', 'manager', 'attendant'].includes(userRole)) {
        return res.status(403).json({
          error: "Acesso negado",
        });
      }

      const { stock, operation } = z.object({
        stock: z.number().int().min(0),
        operation: z.enum(['set', 'add', 'subtract']).optional().default('set'),
      }).parse(req.body);

      const product = await storage.getProduct(id, companyId);
      if (!product) {
        return res.status(404).json({
          error: "Produto não encontrado",
        });
      }

      let newStock = stock;
      if (operation === 'add') {
        newStock = product.stock + stock;
      } else if (operation === 'subtract') {
        newStock = Math.max(0, product.stock - stock);
      }

      const updatedProduct = await storage.updateProduct(id, companyId, {
        stock: newStock,
      });

      // Registrar log de auditoria
      await storage.createAuditLog({
        companyId,
        userId,
        action: 'update_stock',
        resource: 'products',
        resourceId: id,
        details: {
          productName: product.name,
          previousStock: product.stock,
          newStock,
          operation,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });

      res.json({
        message: "Estoque atualizado com sucesso",
        product: {
          id: updatedProduct!.id,
          name: updatedProduct!.name,
          stock: updatedProduct!.stock,
          minStock: updatedProduct!.minStock,
        },
      });

    } catch (error) {
      console.error("❌ Erro ao atualizar estoque:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: error.errors,
        });
      }

      res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  });

  console.log("✅ Rotas de produtos configuradas");
}
