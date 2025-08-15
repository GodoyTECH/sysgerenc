/**
 * GodoySys - Seed de Dados Iniciais
 * 
 * Este script popula o banco de dados com dados de demonstração
 * incluindo empresa demo, usuários, produtos e pedidos de exemplo.
 */

import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { 
  InsertCompany, 
  InsertUser, 
  InsertProductCategory, 
  InsertProduct, 
  InsertOrder 
} from "@shared/schema";

/**
 * Executa o seed de dados
 */
export async function runSeed() {
  console.log("🌱 Iniciando seed de dados do GodoySys...");

  try {
    // 1. Criar empresa demo
    console.log("🏢 Criando empresa demo...");
    const demoCompany: InsertCompany = {
      name: "Restaurante Demo",
      email: "contato@restaurantedemo.com.br",
      phone: "(11) 99999-9999",
      address: "Rua das Flores, 123 - Centro - São Paulo/SP",
      settings: {
        currency: "BRL",
        timezone: "America/Sao_Paulo",
        workingHours: { start: "08:00", end: "22:00" },
        features: ["pdv", "kitchen", "chat", "reports", "multi_user"],
      },
    };

    const company = await storage.createCompany(demoCompany);
    console.log(`✅ Empresa criada: ${company.name} (${company.id})`);

    // 2. Criar usuários demo
    console.log("👥 Criando usuários demo...");
    const saltRounds = 10;

    // Admin principal
    const adminUser: InsertUser = {
      companyId: company.id,
      name: "Carlos Godoy",
      email: "admin@restaurantedemo.com.br",
      username: "admin",
      password: await bcrypt.hash("123456", saltRounds),
      role: "admin",
      isActive: true,
    };
    const admin = await storage.createUser(adminUser);
    console.log(`✅ Admin criado: ${admin.name} (${admin.username})`);

    // Gerente
    const managerUser: InsertUser = {
      companyId: company.id,
      name: "Ana Silva",
      email: "gerente@restaurantedemo.com.br",
      username: "gerente",
      password: await bcrypt.hash("123456", saltRounds),
      role: "manager",
      isActive: true,
    };
    const manager = await storage.createUser(managerUser);
    console.log(`✅ Gerente criado: ${manager.name} (${manager.username})`);

    // Atendente
    const attendantUser: InsertUser = {
      companyId: company.id,
      name: "João Santos",
      email: "atendente@restaurantedemo.com.br",
      username: "atendente",
      password: await bcrypt.hash("123456", saltRounds),
      role: "attendant",
      isActive: true,
    };
    const attendant = await storage.createUser(attendantUser);
    console.log(`✅ Atendente criado: ${attendant.name} (${attendant.username})`);

    // Cozinheiro
    const kitchenUser: InsertUser = {
      companyId: company.id,
      name: "Maria Costa",
      email: "cozinha@restaurantedemo.com.br",
      username: "cozinha",
      password: await bcrypt.hash("123456", saltRounds),
      role: "kitchen",
      isActive: true,
    };
    const kitchen = await storage.createUser(kitchenUser);
    console.log(`✅ Cozinheiro criado: ${kitchen.name} (${kitchen.username})`);

    // 3. Criar categorias de produtos
    console.log("📦 Criando categorias de produtos...");
    
    const categorias = [
      {
        name: "Pratos Principais",
        description: "Pratos principais do cardápio",
        attributes: {
          "tamanho": { type: "select", required: false, options: ["Pequeno", "Médio", "Grande"] },
          "ingredientes": { type: "text", required: false },
          "vegano": { type: "boolean", required: false },
        },
      },
      {
        name: "Bebidas",
        description: "Bebidas e sucos",
        attributes: {
          "volume": { type: "select", required: true, options: ["300ml", "500ml", "1L"] },
          "gelada": { type: "boolean", required: false },
        },
      },
      {
        name: "Sobremesas",
        description: "Doces e sobremesas",
        attributes: {
          "diet": { type: "boolean", required: false },
          "peso": { type: "number", required: false },
        },
      },
    ];

    const createdCategories = [];
    for (const cat of categorias) {
      const category: InsertProductCategory = {
        companyId: company.id,
        ...cat,
      };
      const created = await storage.createProductCategory(category);
      createdCategories.push(created);
      console.log(`✅ Categoria criada: ${created.name}`);
    }

    // 4. Criar produtos demo
    console.log("🍽️ Criando produtos demo...");
    
    const produtos = [
      // Pratos Principais
      {
        categoryId: createdCategories[0].id,
        name: "Hambúrguer Artesanal",
        description: "Hambúrguer 180g, pão brioche, queijo, alface, tomate",
        price: "32.90",
        cost: "15.50",
        stock: 25,
        minStock: 5,
        attributes: { tamanho: "Médio", vegano: false },
      },
      {
        categoryId: createdCategories[0].id,
        name: "Pizza Margherita",
        description: "Massa artesanal, molho de tomate, mussarela, manjericão",
        price: "45.90",
        cost: "18.00",
        stock: 15,
        minStock: 3,
        attributes: { tamanho: "Grande", vegano: false },
      },
      {
        categoryId: createdCategories[0].id,
        name: "Salada Caesar",
        description: "Alface romana, croutons, parmesão, molho caesar",
        price: "28.50",
        cost: "12.00",
        stock: 30,
        minStock: 8,
        attributes: { tamanho: "Médio", vegano: false },
      },
      {
        categoryId: createdCategories[0].id,
        name: "Risotto de Camarão",
        description: "Arroz arbóreo, camarões frescos, vinho branco",
        price: "52.90",
        cost: "28.00",
        stock: 12,
        minStock: 3,
        attributes: { tamanho: "Grande", vegano: false },
      },
      
      // Bebidas
      {
        categoryId: createdCategories[1].id,
        name: "Refrigerante Coca-Cola",
        description: "Refrigerante cola gelado",
        price: "8.50",
        cost: "3.20",
        stock: 48,
        minStock: 12,
        attributes: { volume: "500ml", gelada: true },
      },
      {
        categoryId: createdCategories[1].id,
        name: "Suco de Laranja Natural",
        description: "Suco natural de laranja espremida na hora",
        price: "12.90",
        cost: "4.50",
        stock: 20,
        minStock: 5,
        attributes: { volume: "300ml", gelada: true },
      },
      {
        categoryId: createdCategories[1].id,
        name: "Água Mineral",
        description: "Água mineral sem gás",
        price: "4.50",
        cost: "1.80",
        stock: 35,
        minStock: 10,
        attributes: { volume: "500ml", gelada: true },
      },
      {
        categoryId: createdCategories[1].id,
        name: "Cerveja Artesanal",
        description: "Cerveja artesanal IPA gelada",
        price: "18.90",
        cost: "8.50",
        stock: 24,
        minStock: 6,
        attributes: { volume: "500ml", gelada: true },
      },
      
      // Sobremesas  
      {
        categoryId: createdCategories[2].id,
        name: "Pudim de Leite",
        description: "Pudim cremoso com calda de caramelo",
        price: "15.90",
        cost: "6.50",
        stock: 18,
        minStock: 4,
        attributes: { diet: false, peso: 150 },
      },
      {
        categoryId: createdCategories[2].id,
        name: "Brownie com Sorvete",
        description: "Brownie de chocolate com sorvete de baunilha",
        price: "19.90",
        cost: "8.00",
        stock: 22,
        minStock: 5,
        attributes: { diet: false, peso: 200 },
      },
      {
        categoryId: createdCategories[2].id,
        name: "Salada de Frutas",
        description: "Mix de frutas frescas da estação",
        price: "12.50",
        cost: "5.20",
        stock: 2, // Estoque baixo para demonstrar alerta
        minStock: 8,
        attributes: { diet: true, peso: 180 },
      },
    ];

    const createdProducts = [];
    for (const prod of produtos) {
      const product: InsertProduct = {
        companyId: company.id,
        ...prod,
        isActive: true,
      };
      const created = await storage.createProduct(product);
      createdProducts.push(created);
      console.log(`✅ Produto criado: ${created.name} - R$ ${created.price}`);
    }

    // 5. Criar pedidos demo
    console.log("🧾 Criando pedidos demo...");
    
    const pedidosDemo = [
      {
        userId: attendant.id,
        customerName: "Pedro Silva",
        customerPhone: "(11) 98765-4321",
        table: "Mesa 1",
        status: "delivered" as const,
        items: [
          {
            productId: createdProducts[0].id, // Hambúrguer
            name: createdProducts[0].name,
            price: parseFloat(createdProducts[0].price),
            quantity: 1,
            notes: "Sem cebola",
          },
          {
            productId: createdProducts[4].id, // Coca-Cola
            name: createdProducts[4].name,
            price: parseFloat(createdProducts[4].price),
            quantity: 1,
          },
        ],
        notes: "Cliente preferencial",
      },
      {
        userId: attendant.id,
        customerName: "Ana Costa",
        customerPhone: "(11) 87654-3210",
        table: "Mesa 3",
        status: "preparing" as const,
        items: [
          {
            productId: createdProducts[1].id, // Pizza
            name: createdProducts[1].name,
            price: parseFloat(createdProducts[1].price),
            quantity: 1,
          },
          {
            productId: createdProducts[7].id, // Cerveja
            name: createdProducts[7].name,
            price: parseFloat(createdProducts[7].price),
            quantity: 2,
          },
        ],
        notes: "Pizza bem assada",
      },
      {
        userId: manager.id,
        customerName: "Carlos Oliveira",
        customerPhone: "(11) 76543-2109",
        table: "Mesa 5",
        status: "pending" as const,
        items: [
          {
            productId: createdProducts[2].id, // Salada Caesar
            name: createdProducts[2].name,
            price: parseFloat(createdProducts[2].price),
            quantity: 1,
          },
          {
            productId: createdProducts[5].id, // Suco
            name: createdProducts[5].name,
            price: parseFloat(createdProducts[5].price),
            quantity: 1,
          },
          {
            productId: createdProducts[8].id, // Pudim
            name: createdProducts[8].name,
            price: parseFloat(createdProducts[8].price),
            quantity: 1,
          },
        ],
      },
    ];

    for (const pedido of pedidosDemo) {
      const subtotal = pedido.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = 0;
      const total = subtotal - discount;

      const order: InsertOrder = {
        companyId: company.id,
        userId: pedido.userId,
        customerName: pedido.customerName,
        customerPhone: pedido.customerPhone,
        table: pedido.table,
        status: pedido.status,
        items: pedido.items,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        notes: pedido.notes || null,
      };

      const created = await storage.createOrder(order);
      console.log(`✅ Pedido criado: #${created.id.slice(0, 8)} - ${created.customerName} - R$ ${created.total}`);
    }

    // 6. Criar mensagens demo no chat
    console.log("💬 Criando mensagens demo no chat...");
    
    const mensagensDemo = [
      {
        userId: kitchen.id,
        channel: "kitchen" as const,
        message: "Pedido #001 está quase pronto! 🍔",
      },
      {
        userId: attendant.id,
        channel: "general" as const,
        message: "Bom dia pessoal! Vamos começar mais um dia de trabalho! 😊",
      },
      {
        userId: manager.id,
        channel: "general" as const,
        message: "Lembrando que hoje temos promoção de pizza até 18h",
      },
      {
        userId: admin.id,
        channel: "support" as const,
        message: "Sistema atualizado com sucesso. Relatórios disponíveis.",
      },
    ];

    for (const msg of mensagensDemo) {
      await storage.createChatMessage({
        companyId: company.id,
        userId: msg.userId,
        channel: msg.channel,
        message: msg.message,
        metadata: {},
      });
      console.log(`✅ Mensagem criada: ${msg.channel} - ${msg.message.slice(0, 30)}...`);
    }

    // 7. Criar logs de auditoria iniciais
    console.log("📋 Criando logs de auditoria iniciais...");
    
    await storage.createAuditLog({
      companyId: company.id,
      userId: admin.id,
      action: "system_seed",
      resource: "system",
      details: {
        seedDate: new Date().toISOString(),
        productsCreated: createdProducts.length,
        usersCreated: 4,
        ordersCreated: pedidosDemo.length,
        categoriesCreated: createdCategories.length,
      },
      ipAddress: "127.0.0.1",
      userAgent: "GodoySys Seed Script",
    });

    console.log("✅ Logs de auditoria criados");

    // 8. Exibir resumo final
    console.log("\n🎉 Seed concluído com sucesso!");
    console.log("=" .repeat(50));
    console.log(`🏢 Empresa: ${company.name}`);
    console.log(`👥 Usuários criados: 4`);
    console.log(`📦 Categorias criadas: ${createdCategories.length}`);
    console.log(`🍽️ Produtos criados: ${createdProducts.length}`);
    console.log(`🧾 Pedidos criados: ${pedidosDemo.length}`);
    console.log("=" .repeat(50));
    console.log("\n📝 Credenciais de acesso:");
    console.log("👑 Admin: admin / 123456");
    console.log("👔 Gerente: gerente / 123456");
    console.log("👤 Atendente: atendente / 123456");
    console.log("👨‍🍳 Cozinha: cozinha / 123456");
    console.log("\n🌐 Acesse o sistema e faça login com qualquer uma das contas acima!");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("🌱 Seed executado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Falha no seed:", error);
      process.exit(1);
    });
}
