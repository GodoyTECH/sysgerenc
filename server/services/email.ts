import nodemailer from "nodemailer";

// Configurações do e-mail baseadas nas variáveis de ambiente
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || "gmail";
const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_PASS = process.env.EMAIL_PASS || "";

// Criar transportador do nodemailer
const createTransporter = () => {
  return nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

// Função para enviar relatórios por e-mail
export async function sendReportsEmail(recipientEmail: string, csvData: string): Promise<void> {
  try {
    const transporter = createTransport();
    
    // Gerar nome do arquivo com data atual
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `relatorios_godoy_sys_${currentDate}.csv`;
    
    const mailOptions = {
      from: EMAIL_USER,
      to: recipientEmail,
      subject: `GodoySys - Relatórios ${currentDate}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1F2937 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">📊 GodoySys</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Sistema de Gerenciamento</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #1F2937; margin-top: 0;">Relatórios Gerados</h2>
            
            <p>Olá,</p>
            
            <p>Seus relatórios do GodoySys foram gerados com sucesso e estão em anexo neste e-mail.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3B82F6; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1F2937;">📄 Conteúdo do Relatório:</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
                <li>Vendas e métricas de performance</li>
                <li>Pedidos por status e período</li>
                <li>Produtos mais vendidos</li>
                <li>Análise de estoque</li>
                <li>Logs de auditoria</li>
              </ul>
            </div>
            
            <div style="background: #EFF6FF; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #1D4ED8; font-size: 14px;">
                💡 <strong>Dica:</strong> Você pode abrir o arquivo CSV no Excel, Google Sheets ou qualquer editor de planilhas.
              </p>
            </div>
            
            <p style="color: #666; margin-top: 30px;">
              Data de geração: <strong>${new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</strong>
            </p>
          </div>
          
          <div style="background: #1F2937; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} GodoySys - Sistema de Gerenciamento</p>
            <p style="margin: 5px 0 0 0; opacity: 0.7;">Este e-mail foi gerado automaticamente pelo sistema.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: filename,
          content: csvData,
          contentType: 'text/csv; charset=utf-8',
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail de relatórios enviado:', info.messageId);
    
  } catch (error) {
    console.error('Erro ao enviar e-mail de relatórios:', error);
    throw new Error('Falha ao enviar relatórios por e-mail');
  }
}

// Função para enviar e-mail de boas-vindas
export async function sendWelcomeEmail(recipientEmail: string, userName: string, companyName: string): Promise<void> {
  try {
    const transporter = createTransport();
    
    const mailOptions = {
      from: EMAIL_USER,
      to: recipientEmail,
      subject: `Bem-vindo ao GodoySys - ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1F2937 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Bem-vindo ao GodoySys!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Sistema de Gerenciamento</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #1F2937; margin-top: 0;">Olá, ${userName}!</h2>
            
            <p>Sua conta foi criada com sucesso na empresa <strong>${companyName}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1F2937;">🚀 Próximos Passos:</h3>
              <ol style="margin: 10px 0; padding-left: 20px; color: #666;">
                <li>Faça login no sistema usando suas credenciais</li>
                <li>Configure seu perfil e preferências</li>
                <li>Explore as funcionalidades disponíveis</li>
                <li>Entre em contato com o administrador se tiver dúvidas</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Acessar Sistema
              </a>
            </div>
          </div>
          
          <div style="background: #1F2937; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} GodoySys - Sistema de Gerenciamento</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-mail de boas-vindas enviado:', info.messageId);
    
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error);
    throw new Error('Falha ao enviar e-mail de boas-vindas');
  }
}

// Função para enviar alertas de estoque baixo
export async function sendLowStockAlert(recipientEmails: string[], products: any[]): Promise<void> {
  try {
    const transporter = createTransport();
    
    const productsList = products.map(p => 
      `<li>${p.name} - Estoque atual: <strong style="color: #EF4444;">${p.stock}</strong> (Mínimo: ${p.minStock})</li>`
    ).join('');
    
    const mailOptions = {
      from: EMAIL_USER,
      to: recipientEmails,
      subject: '⚠️ Alerta: Produtos com Estoque Baixo - GodoySys',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #EF4444 0%, #F59E0B 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">⚠️ Alerta de Estoque</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">GodoySys</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #1F2937; margin-top: 0;">Produtos com Estoque Baixo</h2>
            
            <p>Os seguintes produtos estão com estoque abaixo do nível mínimo configurado:</p>
            
            <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; border-left: 4px solid #EF4444; margin: 20px 0;">
              <ul style="margin: 0; padding-left: 20px; color: #666;">
                ${productsList}
              </ul>
            </div>
            
            <p style="color: #666;">
              <strong>Recomendação:</strong> Verifique o estoque destes produtos e providencie reposição quando necessário.
            </p>
          </div>
          
          <div style="background: #1F2937; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} GodoySys - Sistema de Gerenciamento</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Alerta de estoque baixo enviado:', info.messageId);
    
  } catch (error) {
    console.error('Erro ao enviar alerta de estoque:', error);
    throw new Error('Falha ao enviar alerta de estoque baixo');
  }
}
