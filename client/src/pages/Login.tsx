/**
 * GodoySys - Página de Login
 * 
 * Esta página gerencia a autenticação do usuário no sistema,
 * com suporte a multi-tenant e validação de credenciais.
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Store, User, Lock, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/useAuthStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Schema de validação do formulário
const loginSchema = z.object({
  username: z.string().min(1, 'Nome de usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  companyId: z.string().uuid('ID da empresa deve ser um UUID válido').optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuthStore();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setLoginError('');

    try {
      // 🔑 Garante que sempre haverá um companyId (usa "1" se vazio)
      const companyId = data.companyId && data.companyId.trim() !== "" ? data.companyId : "1";

      console.log('🔐 Tentando fazer login...', { 
        username: data.username, 
        companyId 
      });

      const success = await login(data.username, data.password, companyId);

      if (success) {
        toast({
          title: 'Login realizado com sucesso',
          description: 'Bem-vindo ao GodoySys!',
        });
        
        setLocation('/dashboard');
      } else {
        setLoginError('Credenciais inválidas. Verifique usuário, senha e empresa.');
      }

    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      if (error?.status === 401) {
        errorMessage = 'Usuário ou senha incorretos.';
      } else if (error?.status === 400) {
        errorMessage = error?.message || 'Dados inválidos.';
      } else if (error?.code === 'COMPANY_ID_REQUIRED') {
        errorMessage = 'ID da empresa é obrigatório.';
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">GodoySys</h1>
          <p className="text-gray-600 mt-2">Sistema de Gerenciamento Empresarial</p>
        </div>

        {/* Formulário de login */}
        <Card>
          <CardHeader>
            <CardTitle>Fazer Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Empresa (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="companyId" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  ID da Empresa (opcional)
                </Label>
                <Input
                  id="companyId"
                  type="text"
                  placeholder="Deixe em branco para usar a empresa padrão"
                  {...register('companyId')}
                  className={errors.companyId ? 'border-destructive' : ''}
                />
                {errors.companyId && (
                  <p className="text-sm text-destructive">{errors.companyId.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Se não souber, deixe vazio (usa empresa padrão).
                </p>
              </div>

              {/* Usuário */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome de Usuário
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  {...register('username')}
                  className={errors.username ? 'border-destructive' : ''}
                  autoComplete="username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Erro de login */}
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              {/* Botão de submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Entrando...
                  </div>
                ) : (
                  'Fazer Login'
                )}
              </Button>
            </form>

            {/* Credenciais demo */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Credenciais de Demonstração:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Admin:</strong> admin / 123456</p>
                <p><strong>Gerente:</strong> gerente / 123456</p>
                <p><strong>Atendente:</strong> atendente / 123456</p>
                <p><strong>Cozinha:</strong> cozinha / 123456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>&copy; 2024 GodoySys. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
