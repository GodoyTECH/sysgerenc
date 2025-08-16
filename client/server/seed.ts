import bcrypt from "bcryptjs";
import { storage } from "./storage";

// Função principal para executar o seed
export async function runSeed() {
  try {
    console.log("🌱 Iniciando seed do banco de dados...");

    // Criar empresa demo
    const demoCompany = await storage.createCompany({
      name: "Restaurante Demo",
      email: "contato@restaurantedemo.com.br",
      phone: "(11) 99999-9999",
      address: "Rua das Delícias, 123 - Centro, São Paulo - SP",
      settings: {
        timezone: "America/Sao_Paulo",
        currency: "BRL",
        taxRate: 0.1,
        serviceCharge: 0.12,
        defaultEstimatedTime: 30,
        allowTableService: true,
        allowDelivery: true,
        allowTakeaway: true,
      },
    });

    console.log(`✅ Empresa criada: ${demoCompany.name} (ID: ${demoCompany.id})`);

    // Criar usuário administrador
    const adminUser = await storage.createUser({
      companyId: demoCompany.id,
      username: "admin",
      email: "admin@restaurantedemo.com.br",
      password: await bcrypt.hash("admin123", 10),
      name: "Administrador Demo",
      role: "admin",
    });

    console.log(`✅ Usuário admin criado: ${adminUser.name} (ID: ${adminUser.id})`);

    // Criar usuário atendente
    const attendantUser = await storage.createUser({
      companyId: demoCompany.id,
      username: "atendente",
      email: "atendente@restaurantedemo.com.br",
      password: await bcrypt.hash("123456", 10),
      name: "Maria Atendente",
      role: "attendant",
    });

    console.log(`✅ Usuário atendente criado: ${attendantUser.name} (ID: ${attendantUser.id})`);

    // Criar usuário da cozinha
    const kitchenUser = await storage.createUser({
      companyId: demoCompany.id,
      username: "cozinha",
      email: "cozinha@restaurantedemo.com.br",
      password: await bcrypt.hash("123456", 10),
      name: "João Cozinheiro",
      role: "kitchen",
    });

    console.log(`✅ Usuário cozinha criado: ${kitchenUser.name} (ID: ${kitchenUser.id})`);

    // Criar categorias de produtos
    const categories = await Promise.all([
      storage.createCategory({
        companyId: demoCompany.id,
        name: "Pratos Principais",
        description: "Refeições completas e substanciais",
      }),
      storage.createCategory({
        companyId: demoCompany.id,
        name: "Entradas",
        description: "Aperitivos e entrada para começar bem a refeição",
      }),
      storage.createCategory({
        companyId: demoCompany.id,
        name: "Bebidas",
        description: "Sucos, refrigerantes e bebidas diversas",
      }),
      storage.createCategory({
        companyId: demoCompany.id,
        name: "Sobremesas",
        description: "Doces e sobremesas para finalizar",
      }),
    ]);

    console.log(`✅ ${categories.length} categorias criadas`);

    // Criar produtos demo
    const products = [
      // Pratos Principais
      {
        companyId: demoCompany.id,
        categoryId: categories[0].id,
        name: "Hambúrguer Artesanal",
        description: "Hambúrguer 180g, queijo, bacon, alface, tomate e batata frita",
        price: "28.90",
        cost: "15.50",
        stock: 25,
        minStock: 5,
        attributes: {
          ingredients: ["carne", "queijo", "bacon", "alface", "tomate"],
          allergens: ["glúten", "lactose"],
          preparationTime: 20,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[0].id,
        name: "Lasanha à Bolonhesa",
        description: "Lasanha tradicional com molho bolonhesa e queijo gratinado",
        price: "32.50",
        cost: "18.00",
        stock: 15,
        minStock: 3,
        attributes: {
          ingredients: ["massa", "carne moída", "queijo", "molho de tomate"],
          allergens: ["glúten", "lactose"],
          preparationTime: 25,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[0].id,
        name: "Peixe Grelhado",
        description: "Salmão grelhado com legumes e arroz integral",
        price: "42.00",
        cost: "28.00",
        stock: 12,
        minStock: 3,
        attributes: {
          ingredients: ["salmão", "legumes", "arroz integral"],
          allergens: ["peixe"],
          preparationTime: 18,
        },
      },
      
      // Entradas
      {
        companyId: demoCompany.id,
        categoryId: categories[1].id,
        name: "Bruschetta",
        description: "Pão italiano com tomate, manjericão e azeite",
        price: "18.50",
        cost: "8.00",
        stock: 30,
        minStock: 8,
        attributes: {
          ingredients: ["pão", "tomate", "manjericão", "azeite"],
          allergens: ["glúten"],
          preparationTime: 8,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[1].id,
        name: "Coxinha de Frango",
        description: "Tradicional coxinha brasileira com frango desfiado",
        price: "8.50",
        cost: "3.50",
        stock: 50,
        minStock: 15,
        attributes: {
          ingredients: ["frango", "massa", "temperos"],
          allergens: ["glúten"],
          preparationTime: 12,
        },
      },
      
      // Bebidas
      {
        companyId: demoCompany.id,
        categoryId: categories[2].id,
        name: "Suco Natural de Laranja",
        description: "Suco de laranja natural 500ml",
        price: "12.00",
        cost: "4.50",
        stock: 40,
        minStock: 10,
        attributes: {
          volume: "500ml",
          natural: true,
          preparationTime: 3,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[2].id,
        name: "Refrigerante Lata",
        description: "Coca-Cola, Pepsi ou Guaraná 350ml",
        price: "6.50",
        cost: "2.80",
        stock: 80,
        minStock: 20,
        attributes: {
          volume: "350ml",
          options: ["Coca-Cola", "Pepsi", "Guaraná"],
          preparationTime: 1,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[2].id,
        name: "Água Mineral",
        description: "Água mineral sem gás 500ml",
        price: "4.00",
        cost: "1.50",
        stock: 100,
        minStock: 30,
        attributes: {
          volume: "500ml",
          gasificada: false,
          preparationTime: 1,
        },
      },
      
      // Sobremesas
      {
        companyId: demoCompany.id,
        categoryId: categories[3].id,
        name: "Pudim de Leite",
        description: "Pudim cremoso de leite condensado com calda de caramelo",
        price: "15.00",
        cost: "6.50",
        stock: 20,
        minStock: 5,
        attributes: {
          ingredients: ["leite condensado", "ovos", "açúcar"],
          allergens: ["lactose", "ovos"],
          preparationTime: 5,
        },
      },
      {
        companyId: demoCompany.id,
        categoryId: categories[3].id,
        name: "Brigadeiro Gourmet",
        description: "Brigadeiro artesanal com chocolate belga (unidade)",
        price: "4.50",
        cost: "1.80",
        stock: 60,
        minStock: 15,
        attributes: {
          ingredients: ["chocolate belga", "leite condensado", "manteiga"],
          allergens: ["lactose"],
          preparationTime: 2,
        },
      },
    ];

    for (const productData of products) {
      const product = await storage.createProduct(productData);
      console.log(`✅ Produto criado: ${product.name} - R$ ${product.price}`);
    }

    // Criar alguns pedidos demo para mostrar o sistema funcionando
    const orders = [
      {
        companyId: demoCompany.id,
        userId: attendantUser.id,
        customerName: "João Silva",
        customerPhone: "(11) 98765-4321",
        table: "Mesa 5",
        status: "preparing" as const,
        paymentStatus: "paid" as const,
        paymentMethod: "cartão",
        subtotal: "47.40",
        discount: "0.00",
        tax: "4.74",
        total: "52.14",
        notes: "Sem cebola no hambúrguer",
        estimatedTime: 25,
      },
      {
        companyId: demoCompany.id,
        userId: attendantUser.id,
        customerName: "Maria Santos",
        customerPhone: "(11) 97654-3210",
        table: "Mesa 2",
        status: "ready" as const,
        paymentStatus: "paid" as const,
        paymentMethod: "dinheiro",
        subtotal: "18.50",
        discount: "0.00",
        tax: "1.85",
        total: "20.35",
        notes: "",
        estimatedTime: 15,
      },
      {
        companyId: demoCompany.id,
        userId: attendantUser.id,
        customerName: "Carlos Oliveira",
        customerPhone: "(11) 96543-2109",
        table: "Mesa 8",
        status: "pending" as const,
        paymentStatus: "pending" as const,
        paymentMethod: "",
        subtotal: "74.50",
        discount: "5.00",
        tax: "6.95",
        total: "76.45",
        notes: "Peixe mal passado, sem sal no arroz",
        estimatedTime: 30,
      },
    ];

    for (const orderData of orders) {
      const order = await storage.createOrder(orderData);
      console.log(`✅ Pedido criado: #${order.id} - ${order.customerName} - R$ ${order.total}`);
    }

    // Criar algumas mensagens de chat demo
    const chatMessages = [
      {
        companyId: demoCompany.id,
        userId: adminUser.id,
        channel: "general" as const,
        message: "Bem-vindos ao sistema GodoySys! 🎉",
      },
      {
        companyId: demoCompany.id,
        userId: attendantUser.id,
        channel: "general" as const,
        message: "Olá! Cliente da mesa 5 perguntou sobre o tempo do pedido.",
      },
      {
        companyId: demoCompany.id,
        userId: kitchenUser.id,
        channel: "kitchen" as const,
        message: "Pedido #12034 está quase pronto! Faltam 5 minutos.",
      },
      {
        companyId: demoCompany.id,
        userId: adminUser.id,
        channel: "support" as const,
        message: "Sistema funcionando normalmente. Todos os módulos operacionais.",
      },
    ];

    for (const messageData of chatMessages) {
      const message = await storage.createChatMessage(messageData);
      console.log(`✅ Mensagem criada: ${message.message.substring(0, 30)}...`);
    }

    // Criar alguns logs de auditoria iniciais
    await storage.createAuditLog({
      companyId: demoCompany.id,
      userId: adminUser.id,
      action: "seed_database",
      resource: "system",
      details: {
        productsCreated: products.length,
        usersCreated: 3,
        categoriesCreated: categories.length,
        ordersCreated: orders.length,
      },
      ipAddress: "127.0.0.1",
      userAgent: "GodoySys Seed Script",
    });

    console.log("🎉 Seed concluído com sucesso!");
    console.log("\n📋 CREDENCIAIS DE ACESSO:");
    console.log(`👨‍💼 Admin: username='admin', password='admin123'`);
    console.log(`👩‍💼 Atendente: username='atendente', password='123456'`);
    console.log(`👨‍🍳 Cozinha: username='cozinha', password='123456'`);
    console.log(`🏢 Empresa: ${demoCompany.name}`);
    console.log(`🔑 PIN Admin: ${process.env.ADMIN_MASTER_PIN || "1234"}`);
    
    return {
      company: demoCompany,
      users: {
        admin: adminUser,
        attendant: attendantUser,
        kitchen: kitchenUser,
      },
      stats: {
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        chatMessages: chatMessages.length,
      },
    };

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("✅ Processo de seed finalizado");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Falha no seed:", error);
      process.exit(1);
    });
}
