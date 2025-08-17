/**
 * GodoySys - Módulo de Autenticação
 * 
 * Este módulo gerencia login, logout, renovação de tokens JWT
 * e validação de credenciais com suporte multi-tenant.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Função de login
export async function loginUser(email: string, password: string) {
  // Busca usuário pelo email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  // Verifica senha
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Senha inválida");
  }

  // Gera tokens
  const accessToken = jwt.sign(
    { userId: user.id, companyId: user.companyId, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Atualiza último login e refreshToken no banco
  await db
    .update(users)
    .set({ lastLogin: new Date(), refreshToken })
    .where(eq(users.id, user.id));

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
  };
}

// Função de registro
export async function registerUser(data: {
  companyId: string;
  username: string;
  email: string;
  password: string;
  name: string;
  role: "admin" | "manager" | "attendant" | "kitchen";
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      companyId: data.companyId,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
    })
    .returning();

  return newUser;
}
