/**
 * GodoySys - Serviço de Email
 * 
 * Este módulo gerencia o envio de emails para relatórios,
 * notificações e outras funcionalidades do sistema.
 */

import nodemailer from 'nodemailer';

// Interface para dados de email
interface EmailData {
  to: string;
  subject: string;
  type: 'reports' | 'notification' | 'welcome';
  data: any;
}

// Interface para dados de relatório
interface ReportEmailData {
  companyName: string;
  reportDate: string;
  summary: {
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    completedOrders: number;
    totalSales: string;
  };
  csvReports: { [key: string]: string };
}

/**
 * Configura o transporter do nodemailer
 */
function createTransporter() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn("⚠️ Credenciais de email não configuradas. Emails serão simulados.");
    return null;
  }

  try {
    const transporter = nodemailer.createTransporter({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    console.log(`📧 Transporter de email configurado: ${emailService}`);
    return transporter;
  } catch (error) {
    console.error("❌ Erro ao configurar transporter de email:", error);
    return null;
  }
}

/**
 * Gera template HTML para email de relatórios
 */
function generateReportsTemplate(data: ReportEmailData): string {
  const { companyName, reportDate, summary, csvReports } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>GodoySys - Relatórios</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: #1F2937; 
          color: white; 
          padding: 20px; 
          text-align: center; 
          border-radius: 8px 8px 0 0; 
        }
        .content { 
          background: #f9fafb; 
          padding: 20px; 
          border: 1px solid #e5e7eb; 
        }
        .summary { 
          background: white; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 15px 0; 
        }
        .metric { 
          display: inline-block; 
          margin: 10px 15px 10px 0; 
          padding: 10px; 
          background: #3B82F6; 
          color: white; 
          border-radius: 6px; 
          min-width: 120px; 
          text-align: center; 
        }
        .metric-label { 
          display: block; 
          font-size: 12px; 
          opacity: 0.9; 
        }
        .metric-value { 
          display: block; 
          font-size: 18px; 
          font-weight: bold; 
          margin-top: 5px; 
        }
        .files { 
          background: white; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 15px 0; 
        }
        .file-item { 
          padding: 8px 0; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .footer { 
          text-align: center; 
          color: #666; 
          font-size: 12px; 
          margin-top: 20px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e7eb; 
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">GodoySys</div>
        <h2>Relatórios Completos</h2>
        <p>${companyName} - ${reportDate}</p>
      </div>
      
      <div class="content">
        <h3>📊 Resumo Executivo</h3>
        <div class="summary">
          <div class="metric">
            <span class="metric-label">Total de Pedidos</span>
            <span class="metric-value">${summary.totalOrders}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Pedidos Entregues</span>
            <span class="metric-value">${summary.completedOrders}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total de Vendas</span>
            <span class="metric-value">R$ ${summary.totalSales}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Produtos</span>
            <span class="metric-value">${summary.totalProducts}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Usuários</span>
            <span class="metric-value">${summary.totalUsers}</span>
          </div>
        </div>
        
        <h3>📋 Arquivos em Anexo</h3>
        <div class="files">
          <p>Os seguintes relatórios foram gerados e estão anexados a este email:</p>
          ${Object.keys(csvReports).map(key => `
            <div class="file-item">
              <strong>${key.replace('_', ' ').toUpperCase()}.csv</strong> - 
              ${csvReports[key].split('\n').length - 1} registros
            </div>
          `).join('')}
        </div>
        
        <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <strong>⚠️ Importante:</strong> 
          Estes relatórios contêm informações confidenciais da empresa. 
          Mantenha-os seguros e não compartilhe com pessoas não autorizadas.
        </div>
      </div>
      
      <div class="footer">
        <p>GodoySys - Sistema de Gerenciamento Empresarial</p>
        <p>Este email foi gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Gera template HTML para email de notificação
 */
function generateNotificationTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>GodoySys - Notificação</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1F2937; color: white; padding: 15px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>GodoySys - Notificação</h2>
        </div>
        <div class="content">
          <h3>${data.title || 'Notificação do Sistema'}</h3>
          <p>${data.message || 'Uma nova notificação foi gerada pelo sistema.'}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envia um email
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  const transporter = createTransporter();
  
  // Se não há transporter configurado, simular envio
  if (!transporter) {
    console.log(`📧 [SIMULADO] Email enviado para ${emailData.to}`);
    console.log(`   Assunto: ${emailData.subject}`);
    console.log(`   Tipo: ${emailData.type}`);
    
    if (emailData.type === 'reports') {
      console.log(`   Relatórios: ${Object.keys((emailData.data as ReportEmailData).csvReports).join(', ')}`);
    }
    
    return true;
  }

  try {
    let html = '';
    let attachments: any[] = [];

    // Gerar conteúdo baseado no tipo
    switch (emailData.type) {
      case 'reports':
        html = generateReportsTemplate(emailData.data as ReportEmailData);
        
        // Adicionar CSVs como anexos
        const csvReports = (emailData.data as ReportEmailData).csvReports;
        attachments = Object.entries(csvReports).map(([name, content]) => ({
          filename: `${name}.csv`,
          content: content,
          contentType: 'text/csv; charset=utf-8',
        }));
        break;
        
      case 'notification':
        html = generateNotificationTemplate(emailData.data);
        break;
        
      default:
        html = `<p>${emailData.data.message || 'Email enviado pelo GodoySys'}</p>`;
    }

    // Configurar email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailData.to,
      subject: emailData.subject,
      html: html,
      attachments: attachments,
    };

    // Enviar email
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email enviado com sucesso para ${emailData.to}`);
    console.log(`   Message ID: ${result.messageId}`);
    
    return true;

  } catch (error) {
    console.error("❌ Erro ao enviar email:", error);
    return false;
  }
}

/**
 * Envia email de boas-vindas para novo usuário
 */
export async function sendWelcomeEmail(userEmail: string, userName: string, companyName: string): Promise<boolean> {
  return await sendEmail({
    to: userEmail,
    subject: `Bem-vindo ao GodoySys - ${companyName}`,
    type: 'welcome',
    data: {
      userName,
      companyName,
      message: `Olá ${userName}, sua conta foi criada com sucesso no sistema GodoySys da empresa ${companyName}.`,
    },
  });
}

/**
 * Envia notificação de estoque baixo
 */
export async function sendLowStockAlert(adminEmails: string[], products: any[], companyName: string): Promise<boolean> {
  const productList = products.map(p => `${p.name} (Estoque: ${p.stock})`).join(', ');
  
  const promises = adminEmails.map(email =>
    sendEmail({
      to: email,
      subject: `Alerta de Estoque Baixo - ${companyName}`,
      type: 'notification',
      data: {
        title: 'Alerta de Estoque Baixo',
        message: `Os seguintes produtos estão com estoque baixo: ${productList}`,
      },
    })
  );

  const results = await Promise.all(promises);
  return results.every(result => result);
}
