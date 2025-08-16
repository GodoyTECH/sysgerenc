/**
 * GodoySys - Página de Configurações
 * 
 * Esta página gerencia configurações da empresa, usuários,
 * logs de auditoria e configurações do sistema.
 */

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Clock, 
  Globe, 
  Mail,
  Phone,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  Building2,
  FileText,
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
import { useUser, usePermissions } from '@/store/useAuthStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Tipos para configurações
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'manager' | 'attendant' | 'kitchen';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
  createdAt: string;
}

interface CompanySettings {
  currency: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  features: string[];
}

interface UserFormData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  isActive: boolean;
}

export default function Config() {
  const { toast } = useToast();
  const { user } = useUser();
  const { isAdmin, canManageUsers } = usePermissions();
  const { company, fetchCompany, updateCompany, updateSettings } = useCompanyStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Formulários
  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  
  const [settingsForm, setSettingsForm] = useState<CompanySettings>({
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    workingHours: { start: '08:00', end: '18:00' },
    features: [],
  });
  
  // Modal de usuário
  const [userModal, setUserModal] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    user: null as User | null,
  });
  
  const [userForm, setUserForm] = useState<UserFormData>({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'attendant',
    isActive: true,
  });
  
  // Modal de alteração de senha
  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar se tem acesso às configurações
  if (!canManageUsers && !isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">
              Você não tem permissão para acessar as configurações.
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

  // Preencher formulários quando empresa carrega
  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name,
        email: company.email,
        phone: company.phone || '',
        address: company.address || '',
      });
      
      setSettingsForm({
        currency: company.settings?.currency || 'BRL',
        timezone: company.settings?.timezone || 'America/Sao_Paulo',
        workingHours: company.settings?.workingHours || { start: '08:00', end: '18:00' },
        features: company.settings?.features || [],
      });
    }
  }, [company]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log('⚙️ Carregando dados de configuração...');

      await fetchCompany();

      if (canManageUsers) {
        const usersResponse = await api.get('/users');
        setUsers(usersResponse.data.users);
      }

      if (isAdmin) {
        const logsResponse = await api.get('/company/audit-logs?limit=50');
        setAuditLogs(logsResponse.data.auditLogs);
      }

      console.log('✅ Dados de configuração carregados');
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as configurações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar dados da empresa
  const handleSaveCompany = async () => {
    try {
      setIsSubmitting(true);
      console.log('💾 Salvando dados da empresa...', companyForm);

      await updateCompany(companyForm);

      toast({
        title: 'Empresa atualizada',
        description: 'Dados da empresa foram salvos com sucesso',
      });
    } catch (error) {
      console.error('❌ Erro ao salvar empresa:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados da empresa',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salvar configurações
  const handleSaveSettings = async () => {
    try {
      setIsSubmitting(true);
      console.log('⚙️ Salvando configurações...', settingsForm);

      await updateSettings(settingsForm);

      toast({
        title: 'Configurações salvas',
        description: 'Configurações foram atualizadas com sucesso',
      });
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir modal de usuário
  const openUserModal = (mode: 'create' | 'edit', selectedUser?: User) => {
    if (mode === 'edit' && selectedUser) {
      setUserForm({
        name: selectedUser.name,
        email: selectedUser.email,
        username: selectedUser.username,
        password: '',
        role: selectedUser.role,
        isActive: selectedUser.isActive,
      });
      setUserModal({ isOpen: true, mode, user: selectedUser });
    } else {
      setUserForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'attendant',
        isActive: true,
      });
      setUserModal({ isOpen: true, mode, user: null });
    }
  };

  // Salvar usuário
  const handleSaveUser = async () => {
    try {
      setIsSubmitting(true);
      console.log('👤 Salvando usuário...', userForm);

      if (userModal.mode === 'create') {
        await api.post('/users', userForm);
        toast({
          title: 'Usuário criado',
          description: 'Usuário foi criado com sucesso',
        });
      } else {
        const updateData = { ...userForm };
        if (!updateData.password) {
          delete updateData.password; // Não atualizar senha se vazia
        }
        
        await api.put(`/users/${userModal.user!.id}`, updateData);
        toast({
          title: 'Usuário atualizado',
          description: 'Usuário foi atualizado com sucesso',
        });
      }

      setUserModal({ isOpen: false, mode: 'create', user: null });
      await loadData();

    } catch (error: any) {
      console.error('❌ Erro ao salvar usuário:', error);
      toast({
        title: 'Erro ao salvar usuário',
        description: error?.message || 'Não foi possível salvar o usuário',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar usuário
  const handleDeleteUser = async (selectedUser: User) => {
    if (selectedUser.id === user?.id) {
      toast({
        title: 'Operação não permitida',
        description: 'Você não pode remover sua própria conta',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Tem certeza que deseja remover "${selectedUser.name}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Removendo usuário:', selectedUser.id);
      await api.delete(`/users/${selectedUser.id}`);

      toast({
        title: 'Usuário removido',
        description: 'Usuário foi removido com sucesso',
      });

      await loadData();
    } catch (error) {
      console.error('❌ Erro ao remover usuário:', error);
      toast({
        title: 'Erro ao remover usuário',
        description: 'Não foi possível remover o usuário',
        variant: 'destructive',
      });
    }
  };

  // Alterar senha própria
  const handleChangePassword = async () => {
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e confirmação devem ser iguais',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('🔐 Alterando senha...');

      await api.post('/users/change-password', {
        currentPassword: passwordModal.currentPassword,
        newPassword: passwordModal.newPassword,
        confirmPassword: passwordModal.confirmPassword,
      });

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso',
      });

      setPasswordModal({
        isOpen: false,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error);
      toast({
        title: 'Erro ao alterar senha',
        description: error?.message || 'Não foi possível alterar a senha',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obter label da função
  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      manager: 'Gerente',
      attendant: 'Atendente',
      kitchen: 'Cozinha',
    };
    return labels[role as keyof typeof labels] || role;
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600">Gerencie empresa, usuários e configurações do sistema</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setPasswordModal({ ...passwordModal, isOpen: true })}
          >
            <Key className="w-4 h-4 mr-2" />
            Alterar Senha
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            {canManageUsers && <TabsTrigger value="users">Usuários</TabsTrigger>}
            {isAdmin && <TabsTrigger value="audit">Auditoria</TabsTrigger>}
          </TabsList>

          {/* Tab da Empresa */}
          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa *</Label>
                    <Input
                      id="companyName"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email *</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="companyEmail"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="contato@empresa.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Telefone</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="companyPhone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Endereço</Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        id="companyAddress"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Endereço completo"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveCompany} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Salvando...
                      </div>
                    ) : (
                      'Salvar Empresa'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Configurações */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moeda</Label>
                    <Select 
                      value={settingsForm.currency} 
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select 
                      value={settingsForm.timezone} 
                      onValueChange={(value) => setSettingsForm(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-base font-medium mb-3 block">Horário de Funcionamento</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Abertura</Label>
                      <div className="relative">
                        <Clock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                          id="startTime"
                          type="time"
                          value={settingsForm.workingHours.start}
                          onChange={(e) => setSettingsForm(prev => ({
                            ...prev,
                            workingHours: { ...prev.workingHours, start: e.target.value }
                          }))}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Fechamento</Label>
                      <div className="relative">
                        <Clock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <Input
                          id="endTime"
                          type="time"
                          value={settingsForm.workingHours.end}
                          onChange={(e) => setSettingsForm(prev => ({
                            ...prev,
                            workingHours: { ...prev.workingHours, end: e.target.value }
                          }))}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-base font-medium mb-3 block">Funcionalidades Habilitadas</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'pdv', label: 'PDV/Vendas' },
                      { id: 'kitchen', label: 'Tela da Cozinha' },
                      { id: 'chat', label: 'Chat Interno' },
                      { id: 'reports', label: 'Relatórios' },
                      { id: 'multi_user', label: 'Múltiplos Usuários' },
                      { id: 'inventory', label: 'Controle de Estoque' },
                    ].map((feature) => (
                      <div key={feature.id} className="flex items-center space-x-2">
                        <Switch
                          id={feature.id}
                          checked={settingsForm.features.includes(feature.id)}
                          onCheckedChange={(checked) => {
                            setSettingsForm(prev => ({
                              ...prev,
                              features: checked 
                                ? [...prev.features, feature.id]
                                : prev.features.filter(f => f !== feature.id)
                            }));
                          }}
                        />
                        <Label htmlFor={feature.id}>{feature.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Salvando...
                      </div>
                    ) : (
                      'Salvar Configurações'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Usuários */}
          {canManageUsers && (
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Usuários ({users.length})
                  </CardTitle>
                  <Button onClick={() => openUserModal('create')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Usuário
                  </Button>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
                      <Button onClick={() => openUserModal('create')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Usuário
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Login</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{userItem.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{userItem.username}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{userItem.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getRoleLabel(userItem.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={userItem.isActive ? 'default' : 'secondary'}>
                                {userItem.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {userItem.lastLogin ? (
                                new Date(userItem.lastLogin).toLocaleDateString('pt-BR')
                              ) : (
                                <span className="text-muted-foreground">Nunca</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUserModal('edit', userItem)}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                {userItem.id !== user?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(userItem)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
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
          )}

          {/* Tab de Auditoria */}
          {isAdmin && (
            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Logs de Auditoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum log de auditoria encontrado</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Recurso</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {new Date(log.createdAt).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              {log.userId ? (
                                users.find(u => u.id === log.userId)?.name || 'Usuário removido'
                              ) : (
                                'Sistema'
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>{log.resource}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {log.ipAddress || 'N/A'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Modal de Usuário */}
      <Dialog 
        open={userModal.isOpen} 
        onOpenChange={(open) => setUserModal(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userModal.mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do usuário
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Nome *</Label>
                <Input
                  id="userName"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userUsername">Usuário *</Label>
                <Input
                  id="userUsername"
                  value={userForm.username}
                  onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="userRole">Função *</Label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendant">Atendente</SelectItem>
                    <SelectItem value="kitchen">Cozinha</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    {isAdmin && <SelectItem value="admin">Administrador</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="userPassword">
                Senha {userModal.mode === 'edit' ? '(deixe vazio para manter atual)' : '*'}
              </Label>
              <Input
                id="userPassword"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={userModal.mode === 'edit' ? 'Nova senha (opcional)' : 'Senha'}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="userActive"
                checked={userForm.isActive}
                onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="userActive">Usuário ativo</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setUserModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveUser}
              disabled={isSubmitting || !userForm.name || !userForm.email || !userForm.username}
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

      {/* Modal de Alteração de Senha */}
      <Dialog 
        open={passwordModal.isOpen} 
        onOpenChange={(open) => setPasswordModal(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordModal.currentPassword}
                onChange={(e) => setPasswordModal(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Sua senha atual"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordModal.newPassword}
                onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Nova senha"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordModal.confirmPassword}
                onChange={(e) => setPasswordModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={
                isSubmitting || 
                !passwordModal.currentPassword || 
                !passwordModal.newPassword || 
                !passwordModal.confirmPassword
              }
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Alterando...
                </div>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
